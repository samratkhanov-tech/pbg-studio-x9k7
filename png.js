/*
 * Songlap Puzzle Book Generator — PNG export.
 *
 * Each puzzle is drawn from its DATA (never a DOM screenshot) by a
 * pure "draw plan" builder: buildPlan(type, data, opts) returns
 * { type, width, height, ops: [...] } where ops are abstract canvas
 * commands. renderPlan(canvas, plan) executes the ops on a 2D
 * context. Because the plan layer is pure, the Node tests can verify
 * geometry (canvas size, grid dimensions, op counts) without a
 * browser; only renderPlan/downloadPNG need the DOM.
 *
 * Resolution: grids are drawn into a ~2400px inner area, so the
 * grid's longest side is ≈2400px and the canvas ≈2550px wide —
 * 8.5in at 300 DPI, print-ready for KDP interiors.
 */
(function (global) {
  'use strict';

  var INK = '#14232b';
  var GRID_LINE = '#b9c6cc';
  var GOLD = '#ffd166';
  var GREEN = '#2a7f62';
  var RED = '#e63946';
  var DARKRED = '#c0392b';
  var INNER = 2400;        // target px for a grid's longest side
  var MARGIN = 75;
  var TITLE_H = 170;       // band reserved for the title
  var FONT = 'Arial, Helvetica, sans-serif';

  function newPlan(type, title) {
    return { type: type, title: title || '', width: 0, height: 0, ops: [{ t: 'bg', color: '#ffffff' }] };
  }
  function text(plan, x, y, str, size, opts) {
    opts = opts || {};
    plan.ops.push({
      t: 'text', x: x, y: y, str: String(str), size: size, font: FONT,
      weight: opts.weight || 400, color: opts.color || INK,
      align: opts.align || 'center'
    });
  }
  function titleOp(plan, width, title) {
    text(plan, width / 2, 88, title, 64, { weight: 800 });
  }

  /* ---------- Word Search ---------- */
  function planWordSearch(ws, opts) {
    opts = opts || {};
    var n = ws.size;
    var cell = Math.floor(INNER / n);
    var gw = cell * n;
    var plan = newPlan('word-search', opts.title || 'Word Search');
    plan.width = gw + MARGIN * 2;
    titleOp(plan, plan.width, plan.title);
    var x0 = MARGIN, y0 = TITLE_H;

    var marked = {};
    if (opts.solution) {
      ws.placements.forEach(function (p) {
        for (var i = 0; i < p.word.length; i++) {
          marked[(p.row + p.dr * i) + ',' + (p.col + p.dc * i)] = true;
        }
      });
    }
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var x = x0 + c * cell, y = y0 + r * cell;
        if (marked[r + ',' + c]) {
          plan.ops.push({ t: 'rect', x: x, y: y, w: cell, h: cell, color: GOLD });
        }
        plan.ops.push({ t: 'frame', x: x, y: y, w: cell, h: cell, lw: 2, color: GRID_LINE });
        text(plan, x + cell / 2, y + cell / 2, ws.grid[r][c], Math.round(cell * 0.52), { weight: 600 });
      }
    }
    var bottom = y0 + gw;
    // word list (3 columns) — a word-search image is useless without it
    var words = ws.placements.map(function (p) { return p.word; }).sort();
    if (words.length) {
      text(plan, plan.width / 2, bottom + 62, 'Find these words:', 46, { weight: 700 });
      var cols = 3, colW = gw / cols, lineH = 58;
      words.forEach(function (w, i) {
        var col = Math.floor(i / Math.ceil(words.length / cols));
        var row = i % Math.ceil(words.length / cols);
        text(plan, x0 + col * colW + colW / 2, bottom + 128 + row * lineH, w, 42, {});
      });
      bottom += 128 + Math.ceil(words.length / cols) * lineH;
    }
    plan.height = bottom + MARGIN;
    plan.gridLongest = gw;
    return plan;
  }

  /* ---------- Crossword ---------- */
  function planCrossword(cw, opts) {
    opts = opts || {};
    var cell = Math.floor(INNER / Math.max(cw.rows, cw.cols));
    var gw = cell * cw.cols, gh = cell * cw.rows;
    var plan = newPlan('crossword', opts.title || 'Crossword');
    plan.width = gw + MARGIN * 2;
    titleOp(plan, plan.width, plan.title);
    var x0 = MARGIN, y0 = TITLE_H;
    for (var r = 0; r < cw.rows; r++) {
      for (var c = 0; c < cw.cols; c++) {
        var x = x0 + c * cell, y = y0 + r * cell;
        var letter = cw.grid[r][c];
        if (!letter) {
          plan.ops.push({ t: 'rect', x: x, y: y, w: cell, h: cell, color: INK });
          continue;
        }
        plan.ops.push({ t: 'frame', x: x, y: y, w: cell, h: cell, lw: 2, color: GRID_LINE });
        var num = cw.numbers[r + ',' + c];
        if (num) {
          plan.ops.push({
            t: 'text', x: x + cell * 0.08, y: y + cell * 0.2, str: String(num),
            size: Math.round(cell * 0.3), font: FONT, weight: 700, color: '#5a707a', align: 'left'
          });
        }
        if (opts.solution) {
          text(plan, x + cell / 2, y + cell * 0.58, letter, Math.round(cell * 0.52), { weight: 600 });
        }
      }
    }
    plan.height = y0 + gh + MARGIN;
    plan.gridLongest = Math.max(gw, gh);
    return plan;
  }

  /* ---------- Sudoku ---------- */
  function planSudoku(s, opts) {
    opts = opts || {};
    var cell = Math.floor(INNER / 9);
    var gw = cell * 9;
    var plan = newPlan('sudoku', opts.title || 'Sudoku');
    plan.width = gw + MARGIN * 2;
    titleOp(plan, plan.width, plan.title);
    var x0 = MARGIN, y0 = TITLE_H;
    var i;
    for (i = 0; i <= 9; i++) {
      var thick = i % 3 === 0;
      var lw = thick ? 12 : 3;
      var p = i * cell;
      plan.ops.push({ t: 'line', x1: x0 + p, y1: y0, x2: x0 + p, y2: y0 + gw, lw: lw, color: INK });
      plan.ops.push({ t: 'line', x1: x0, y1: y0 + p, x2: x0 + gw, y2: y0 + p, lw: lw, color: INK });
    }
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var given = s.puzzle[r][c] !== 0;
        var val = opts.solution ? s.solution[r][c] : (given ? s.puzzle[r][c] : 0);
        if (!val) continue;
        text(plan, x0 + c * cell + cell / 2, y0 + r * cell + cell / 2, val,
          Math.round(cell * 0.56),
          given ? { weight: 800 } : { weight: 600, color: GREEN });
      }
    }
    plan.height = y0 + gw + MARGIN;
    plan.gridLongest = gw;
    return plan;
  }

  /* ---------- Maze ---------- */
  function planMaze(maze, opts) {
    opts = opts || {};
    var cell = Math.floor(INNER / Math.max(maze.cols, maze.rows));
    var gw = cell * maze.cols, gh = cell * maze.rows;
    var plan = newPlan('maze', opts.title || 'Maze');
    plan.width = gw + MARGIN * 2;
    titleOp(plan, plan.width, plan.title);
    var x0 = MARGIN, y0 = TITLE_H;
    if (opts.solution && typeof PG !== 'undefined') {
      var path = PG.solveMaze(maze);
      if (path) {
        plan.ops.push({
          t: 'path',
          pts: path.map(function (idx) {
            var r = Math.floor(idx / maze.cols), c = idx % maze.cols;
            return [x0 + c * cell + cell / 2, y0 + r * cell + cell / 2];
          }),
          lw: Math.max(6, Math.round(cell / 4)), color: RED
        });
      }
    }
    plan.ops.push({ t: 'circle', x: x0 + cell / 2, y: y0 + cell / 2, r: cell / 4, color: GREEN });
    plan.ops.push({ t: 'circle', x: x0 + gw - cell / 2, y: y0 + gh - cell / 2, r: cell / 4, color: RED });
    for (var r2 = 0; r2 < maze.rows; r2++) {
      for (var c2 = 0; c2 < maze.cols; c2++) {
        var w = maze.walls[r2 * maze.cols + c2];
        var x = x0 + c2 * cell, y = y0 + r2 * cell;
        if (w & 1) plan.ops.push({ t: 'line', x1: x, y1: y, x2: x + cell, y2: y, lw: 5, color: INK });
        if (w & 2) plan.ops.push({ t: 'line', x1: x + cell, y1: y, x2: x + cell, y2: y + cell, lw: 5, color: INK });
        if (w & 4) plan.ops.push({ t: 'line', x1: x, y1: y + cell, x2: x + cell, y2: y + cell, lw: 5, color: INK });
        if (w & 8) plan.ops.push({ t: 'line', x1: x, y1: y, x2: x, y2: y, lw: 5, color: INK });
      }
    }
    plan.height = y0 + gh + MARGIN;
    plan.gridLongest = Math.max(gw, gh);
    return plan;
  }

  /* ---------- Mystery ---------- */
  function planMarkingGrid(plan, x0, y0, heading, m, items, correctMap) {
    var n = m.suspects.length;
    var labelW = 640, headerH = 190, rowH = 220;
    var cellW = Math.floor((INNER - labelW) / n);
    var gridW = labelW + cellW * n;
    text(plan, x0, y0 + 30, heading, 48, { weight: 700, align: 'left' });
    var gy = y0 + 70;
    // header row
    plan.ops.push({ t: 'rect', x: x0, y: gy, w: gridW, h: headerH, color: '#eef3f5' });
    plan.ops.push({ t: 'frame', x: x0, y: gy, w: labelW, h: headerH, lw: 3, color: GRID_LINE });
    items.forEach(function (it, i) {
      var x = x0 + labelW + i * cellW;
      plan.ops.push({ t: 'frame', x: x, y: gy, w: cellW, h: headerH, lw: 3, color: GRID_LINE });
      text(plan, x + cellW / 2, gy + headerH / 2, it, 40, { weight: 700 });
    });
    m.suspects.forEach(function (s, ri) {
      var y = gy + headerH + ri * rowH;
      plan.ops.push({ t: 'frame', x: x0, y: y, w: labelW, h: rowH, lw: 3, color: GRID_LINE });
      text(plan, x0 + 24, y + rowH / 2, s.name, 44, { weight: 700, align: 'left' });
      items.forEach(function (it, i) {
        var x = x0 + labelW + i * cellW;
        plan.ops.push({ t: 'frame', x: x, y: y, w: cellW, h: rowH, lw: 3, color: GRID_LINE });
        if (correctMap) {
          var yes = correctMap[s.name] === it;
          text(plan, x + cellW / 2, y + rowH / 2, yes ? '✓' : '✗',
            yes ? 120 : 100, { weight: 800, color: yes ? GREEN : DARKRED });
        }
      });
    });
    return headerH + n * rowH; // grid height (excluding heading)
  }

  function planMystery(m, opts) {
    opts = opts || {};
    var plan = newPlan('mystery', opts.title || m.title);
    plan.width = INNER + MARGIN * 2;
    titleOp(plan, plan.width, plan.title);
    var y = TITLE_H;
    if (opts.solution) {
      text(plan, plan.width / 2, y + 10,
        'Solution: ' + m.solution.culprit + ' — with the ' + m.solution.weapon +
        ', in the ' + m.solution.room, 46, { weight: 700, color: GREEN });
      y += 80;
    }
    var h1 = planMarkingGrid(plan, MARGIN, y, 'Who had what?', m, m.weapons,
      opts.solution ? m.assignment.weaponOf : null);
    y += 70 + h1 + 90;
    var h2 = planMarkingGrid(plan, MARGIN, y, 'Who was where?', m, m.rooms,
      opts.solution ? m.assignment.roomOf : null);
    y += 70 + h2;
    plan.height = y + MARGIN;
    plan.gridLongest = INNER;
    return plan;
  }

  /* ---------- dispatch ---------- */
  function buildPlan(type, data, opts) {
    switch (type) {
      case 'word-search': return planWordSearch(data, opts);
      case 'crossword': return planCrossword(data, opts);
      case 'sudoku': return planSudoku(data, opts);
      case 'maze': return planMaze(data, opts);
      case 'mystery': return planMystery(data, opts);
    }
    throw new Error('PNGExport: unknown type ' + type);
  }

  /* ---------- canvas execution (browser only) ---------- */
  function renderPlan(canvas, plan) {
    canvas.width = plan.width;
    canvas.height = plan.height;
    var ctx = canvas.getContext('2d');
    plan.ops.forEach(function (op) {
      ctx.globalAlpha = op.alpha != null ? op.alpha : 1;
      switch (op.t) {
        case 'bg':
          ctx.fillStyle = op.color;
          ctx.fillRect(0, 0, plan.width, plan.height);
          break;
        case 'rect':
          ctx.fillStyle = op.color;
          ctx.fillRect(op.x, op.y, op.w, op.h);
          break;
        case 'frame':
          ctx.strokeStyle = op.color;
          ctx.lineWidth = op.lw;
          ctx.strokeRect(op.x, op.y, op.w, op.h);
          break;
        case 'line':
          ctx.strokeStyle = op.color;
          ctx.lineWidth = op.lw;
          ctx.beginPath();
          ctx.moveTo(op.x1, op.y1);
          ctx.lineTo(op.x2, op.y2);
          ctx.stroke();
          break;
        case 'circle':
          ctx.fillStyle = op.color;
          ctx.beginPath();
          ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'path':
          ctx.strokeStyle = op.color;
          ctx.lineWidth = op.lw;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          op.pts.forEach(function (p, i) {
            if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
          });
          ctx.stroke();
          break;
        case 'text':
          ctx.fillStyle = op.color;
          ctx.font = op.weight + ' ' + op.size + 'px ' + op.font;
          ctx.textAlign = op.align;
          ctx.textBaseline = 'middle';
          ctx.fillText(op.str, op.x, op.y);
          break;
      }
      ctx.globalAlpha = 1;
    });
    return canvas;
  }

  function downloadPNG(type, data, opts) {
    var plan = buildPlan(type, data, opts);
    var canvas = document.createElement('canvas');
    renderPlan(canvas, plan);
    var filename = type + '-puzzle.png';
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }, 'image/png');
    } else {
      var a2 = document.createElement('a');
      a2.href = canvas.toDataURL('image/png');
      a2.download = filename;
      document.body.appendChild(a2);
      a2.click();
      a2.remove();
    }
    return plan;
  }

  var api = {
    buildPlan: buildPlan,
    renderPlan: renderPlan,
    downloadPNG: downloadPNG,
    planWordSearch: planWordSearch,
    planCrossword: planCrossword,
    planSudoku: planSudoku,
    planMaze: planMaze,
    planMystery: planMystery,
    INNER: INNER
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PNGExport = api;
})(typeof window !== 'undefined' ? window : globalThis);
