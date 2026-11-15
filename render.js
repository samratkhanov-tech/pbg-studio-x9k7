/*
 * Songlap Puzzle Book Generator — HTML renderers for puzzles.
 * Pure string builders: used by the single-puzzle tabs (app.js) and the
 * Book Builder (book.js) so screen and print output look identical.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- Word Search ---------- */
  // opts: { solution: bool, fontSize: css size for cells }
  function wordSearchHTML(ws, opts) {
    opts = opts || {};
    var marked = {};
    if (opts.solution) {
      ws.placements.forEach(function (p) {
        for (var i = 0; i < p.word.length; i++) {
          marked[(p.row + p.dr * i) + ',' + (p.col + p.dc * i)] = true;
        }
      });
    }
    var fs = opts.fontSize || (ws.size >= 18 ? '11px' : ws.size >= 15 ? '13px' : '16px');
    var h = '<table class="pgrid ws-grid" style="font-size:' + fs + '"><tbody>';
    for (var r = 0; r < ws.size; r++) {
      h += '<tr>';
      for (var c = 0; c < ws.size; c++) {
        h += '<td' + (marked[r + ',' + c] ? ' class="hit"' : '') + '>' + ws.grid[r][c] + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  function wordListHTML(ws) {
    var words = ws.placements.map(function (p) { return p.word; }).sort();
    var h = '<div class="word-list"><h4>Find these words:</h4><ul>';
    words.forEach(function (w) { h += '<li>' + esc(w) + '</li>'; });
    h += '</ul>';
    if (ws.unplaced && ws.unplaced.length) {
      h += '<p class="unplaced">Not placed (too long or no room): ' +
        ws.unplaced.map(esc).join(', ') + '</p>';
    }
    h += '</div>';
    return h;
  }

  /* ---------- Crossword ---------- */
  function crosswordHTML(cw, opts) {
    opts = opts || {};
    var fs = opts.fontSize || (Math.max(cw.rows, cw.cols) >= 13 ? '12px' : '15px');
    var h = '<table class="pgrid cw-grid" style="font-size:' + fs + '"><tbody>';
    for (var r = 0; r < cw.rows; r++) {
      h += '<tr>';
      for (var c = 0; c < cw.cols; c++) {
        var letter = cw.grid[r][c];
        if (!letter) { h += '<td class="black"></td>'; continue; }
        var num = cw.numbers[r + ',' + c];
        h += '<td class="cw-cell">' +
          (num ? '<span class="cw-num">' + num + '</span>' : '') +
          '<span class="cw-letter">' + (opts.solution ? letter : '') + '</span></td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  function clueListsHTML(cw) {
    function list(title, arr) {
      var h = '<div class="clue-col"><h4>' + title + '</h4><ol class="clues">';
      arr.forEach(function (p) {
        h += '<li><strong>' + p.number + '.</strong> ' + esc(p.clue) +
          ' <span class="clue-len">(' + p.word.length + ')</span></li>';
      });
      return h + '</ol></div>';
    }
    var h = '<div class="clue-lists">' + list('Across', cw.across) + list('Down', cw.down) + '</div>';
    if (cw.unplaced && cw.unplaced.length) {
      h += '<p class="unplaced">Not placed (no valid crossing found): ' +
        cw.unplaced.map(esc).join(', ') + '</p>';
    }
    return h;
  }

  /* ---------- Sudoku ---------- */
  function sudokuHTML(s, opts) {
    opts = opts || {};
    var h = '<table class="pgrid su-grid"><tbody>';
    for (var r = 0; r < 9; r++) {
      h += '<tr>';
      for (var c = 0; c < 9; c++) {
        var cls = [];
        if (c === 2 || c === 5) cls.push('br');
        if (r === 2 || r === 5) cls.push('bb');
        var given = s.puzzle[r][c] !== 0;
        var val = opts.solution ? s.solution[r][c] : (given ? s.puzzle[r][c] : '');
        if (given) cls.push('given');
        else if (opts.solution) cls.push('solved');
        h += '<td class="' + cls.join(' ') + '">' + (val || '') + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  /* ---------- Maze (SVG) ---------- */
  function mazeSVG(maze, opts) {
    opts = opts || {};
    var cell = 20;
    var W = maze.cols * cell, H = maze.rows * cell;
    var parts = ['<svg class="maze-svg" viewBox="0 0 ' + W + ' ' + H +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Maze">'];
    parts.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>');
    if (opts.solution) {
      var path = PG.solveMaze(maze);
      if (path) {
        var pts = path.map(function (idx) {
          var r = Math.floor(idx / maze.cols), c = idx % maze.cols;
          return (c * cell + cell / 2) + ',' + (r * cell + cell / 2);
        }).join(' ');
        parts.push('<polyline points="' + pts + '" fill="none" stroke="#e63946" ' +
          'stroke-width="' + Math.max(3, cell / 4) + '" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>');
      }
    }
    // start / finish markers
    parts.push('<circle cx="' + cell / 2 + '" cy="' + cell / 2 + '" r="' + cell / 4 + '" fill="#2a9d8f"/>');
    parts.push('<circle cx="' + (W - cell / 2) + '" cy="' + (H - cell / 2) + '" r="' + cell / 4 + '" fill="#e63946"/>');
    var lines = '';
    for (var r = 0; r < maze.rows; r++) {
      for (var c = 0; c < maze.cols; c++) {
        var w = maze.walls[r * maze.cols + c];
        var x = c * cell, y = r * cell;
        if (w & 1) lines += 'M' + x + ' ' + y + 'H' + (x + cell);
        if (w & 2) lines += 'M' + (x + cell) + ' ' + y + 'V' + (y + cell);
        if (w & 4) lines += 'M' + x + ' ' + (y + cell) + 'H' + (x + cell);
        if (w & 8) lines += 'M' + x + ' ' + y + 'V' + (y + cell);
      }
    }
    parts.push('<path d="' + lines + '" stroke="#14232b" stroke-width="2" fill="none"/>');
    parts.push('</svg>');
    return parts.join('');
  }

  global.Render = {
    esc: esc,
    wordSearchHTML: wordSearchHTML,
    wordListHTML: wordListHTML,
    crosswordHTML: crosswordHTML,
    clueListsHTML: clueListsHTML,
    sudokuHTML: sudokuHTML,
    mazeSVG: mazeSVG
  };
})(window);
