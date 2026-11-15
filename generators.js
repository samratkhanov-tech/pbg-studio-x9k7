/*
 * Songlap Puzzle Book Generator — pure puzzle logic.
 * Works in the browser (window.PG) and in Node (module.exports) for tests.
 * No dependencies, no network, no DOM.
 */
(function (global) {
  'use strict';

  /* ---------------- RNG helpers ---------------- */

  function makeRng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, n) { return Math.floor(rng() * n); }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(rng, i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function pick(rng, arr) { return arr[randInt(rng, arr.length)]; }

  /* ---------------- Built-in content ---------------- */

  var WORD_THEMES = {
    Animals: ['ELEPHANT', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'BUFFALO', 'CHEETAH',
      'GORILLA', 'OCTOPUS', 'RACCOON', 'LEOPARD', 'ZEBRA', 'KOALA', 'PANDA',
      'TIGER', 'LION', 'BEAR', 'WOLF', 'DEER', 'HORSE', 'CAMEL', 'DONKEY',
      'MONKEY', 'TURTLE', 'RABBIT', 'SQUIRREL', 'FALCON'],
    Christmas: ['SANTA', 'REINDEER', 'SLEIGH', 'SNOWMAN', 'STOCKING', 'GARLAND',
      'ORNAMENT', 'TINSEL', 'MISTLETOE', 'CAROL', 'JINGLE', 'BELLS', 'CANDLE',
      'WREATH', 'FIREPLACE', 'CHIMNEY', 'PRESENT', 'EVERGREEN', 'SNOWFLAKE',
      'HOLLY', 'RUDOLPH', 'NOEL', 'ELF', 'STAR', 'COCOA'],
    "Valentine's": ['CUPID', 'HEART', 'ROSES', 'KISSES', 'HUGS', 'LOVE',
      'SWEETHEART', 'CHOCOLATE', 'BALLOON', 'ARROW', 'CARD', 'GIFT', 'POEM',
      'CRUSH', 'ADORE', 'CHARM', 'TENDER', 'ROMANCE', 'FEBRUARY', 'PINK',
      'LACE', 'CUPCAKE', 'RIBBON', 'CHERUB', 'VOW'],
    Food: ['PIZZA', 'PASTA', 'BURGER', 'SUSHI', 'TACOS', 'SALAD', 'BREAD',
      'CHEESE', 'BUTTER', 'HONEY', 'SUGAR', 'COFFEE', 'PANCAKE', 'WAFFLE',
      'MUFFIN', 'COOKIE', 'BROWNIE', 'LASAGNA', 'NOODLE', 'BACON', 'APPLE',
      'GRAPE', 'LEMON', 'MELON', 'PEACH'],
    Travel: ['AIRPORT', 'PASSPORT', 'LUGGAGE', 'JOURNEY', 'VOYAGE', 'TICKET',
      'HOTEL', 'BEACH', 'ISLAND', 'MOUNTAIN', 'CAMERA', 'GUIDE', 'TRAIN',
      'PLANE', 'CRUISE', 'SAFARI', 'MUSEUM', 'HARBOR', 'ANCHOR', 'COMPASS',
      'BACKPACK', 'SUNSET', 'LAGOON', 'DESERT', 'CASTLE']
  };

  var CROSSWORD_EXAMPLE = [
    { word: 'APPLE', clue: 'Fruit that keeps the doctor away' },
    { word: 'GRAPE', clue: 'Wine and jelly fruit' },
    { word: 'LEMON', clue: 'Sour yellow citrus' },
    { word: 'MELON', clue: 'Big juicy summer fruit' },
    { word: 'PEACH', clue: 'Fuzzy stone fruit' },
    { word: 'BERRY', clue: 'Straw- or blue- follower' },
    { word: 'MANGO', clue: 'Tropical "king of fruits"' },
    { word: 'OLIVE', clue: 'Oil-yielding Mediterranean fruit' },
    { word: 'PLUM', clue: 'Purple stone fruit' },
    { word: 'PEAR', clue: 'Bell-shaped orchard fruit' },
    { word: 'KIWI', clue: 'Fuzzy brown fruit, green inside' },
    { word: 'LIME', clue: 'Green citrus in a mojito' },
    { word: 'FIG', clue: 'Ancient fruit in Newton cookies' },
    { word: 'DATE', clue: 'Sweet palm fruit; also a calendar day' }
  ];

  /* ---------------- Word Search ---------------- */

  var WS_DIRS = [
    [0, 1], [1, 0], [1, 1], [1, -1],
    [0, -1], [-1, 0], [-1, -1], [-1, 1]
  ];

  function cleanWord(w) {
    return String(w).toUpperCase().replace(/[^A-Z]/g, '');
  }

  function generateWordSearch(rawWords, size, rng) {
    rng = rng || Math.random;
    size = Math.max(5, Math.min(30, size | 0));
    var seen = {}, words = [];
    (rawWords || []).forEach(function (w) {
      var cw = cleanWord(w);
      if (cw.length >= 2 && !seen[cw]) { seen[cw] = true; words.push(cw); }
    });
    words.sort(function (a, b) { return b.length - a.length; });

    var grid = [];
    for (var r = 0; r < size; r++) {
      grid.push(new Array(size).fill(null));
    }
    var placements = [], unplaced = [];

    words.forEach(function (word) {
      if (word.length > size) { unplaced.push(word); return; }
      var placed = false;
      for (var attempt = 0; attempt < 300 && !placed; attempt++) {
        var d = WS_DIRS[randInt(rng, WS_DIRS.length)];
        var dr = d[0], dc = d[1];
        var r0 = randInt(rng, size), c0 = randInt(rng, size);
        var rEnd = r0 + dr * (word.length - 1);
        var cEnd = c0 + dc * (word.length - 1);
        if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) continue;
        var ok = true;
        for (var i = 0; i < word.length; i++) {
          var cell = grid[r0 + dr * i][c0 + dc * i];
          if (cell !== null && cell !== word[i]) { ok = false; break; }
        }
        if (!ok) continue;
        for (var j = 0; j < word.length; j++) {
          grid[r0 + dr * j][c0 + dc * j] = word[j];
        }
        placements.push({ word: word, row: r0, col: c0, dr: dr, dc: dc });
        placed = true;
      }
      if (!placed) unplaced.push(word);
    });

    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var r2 = 0; r2 < size; r2++) {
      for (var c2 = 0; c2 < size; c2++) {
        if (grid[r2][c2] === null) grid[r2][c2] = letters[randInt(rng, 26)];
      }
    }
    return { size: size, grid: grid, placements: placements, unplaced: unplaced };
  }

  /* ---------------- Crossword ---------------- */

  function cwCanPlace(grid, size, word, row, col, dr, dc, requireCross) {
    var len = word.length;
    // cell before start and after end must be empty / out of bounds
    var br = row - dr, bc = col - dc;
    if (br >= 0 && br < size && bc >= 0 && bc < size && grid[br][bc]) return -1;
    var ar = row + dr * len, ac = col + dc * len;
    if (ar >= 0 && ar < size && ac >= 0 && ac < size && grid[ar][ac]) return -1;
    var crosses = 0;
    for (var i = 0; i < len; i++) {
      var r = row + dr * i, c = col + dc * i;
      if (r < 0 || r >= size || c < 0 || c >= size) return -1;
      var cell = grid[r][c];
      if (cell) {
        if (cell !== word[i]) return -1;
        crosses++;
      } else {
        // perpendicular neighbours of a fresh cell must be empty,
        // otherwise an unintended side word would form
        var pr = dc, pc = dr;
        var r1 = r + pr, c1 = c + pc, r2 = r - pr, c2 = c - pc;
        if (r1 >= 0 && r1 < size && c1 >= 0 && c1 < size && grid[r1][c1]) return -1;
        if (r2 >= 0 && r2 < size && c2 >= 0 && c2 < size && grid[r2][c2]) return -1;
      }
    }
    if (requireCross && crosses === 0) return -1;
    return crosses;
  }

  function cwPut(grid, word, row, col, dr, dc) {
    for (var i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
  }

  function generateCrossword(rawEntries, rng) {
    rng = rng || Math.random;
    var size = 21;
    var entries = [];
    var seen = {};
    (rawEntries || []).forEach(function (e) {
      var w = cleanWord(e.word);
      if (w.length >= 2 && w.length <= size && !seen[w]) {
        seen[w] = true;
        entries.push({ word: w, clue: String(e.clue || '') });
      }
    });
    entries.sort(function (a, b) { return b.word.length - a.word.length; });

    var grid = [];
    for (var r = 0; r < size; r++) grid.push(new Array(size).fill(null));
    var placements = [];
    var placedWords = {};

    function placeFirst(entry) {
      var row = Math.floor(size / 2);
      var col = Math.floor((size - entry.word.length) / 2);
      cwPut(grid, entry.word, row, col, 0, 1);
      placements.push({ word: entry.word, clue: entry.clue, row: row, col: col, dir: 'A' });
      placedWords[entry.word] = true;
    }

    function tryPlace(entry) {
      var best = null;
      placements.forEach(function (p) {
        var pdr = p.dir === 'A' ? 0 : 1, pdc = p.dir === 'A' ? 1 : 0;
        var dr = pdc, dc = pdr; // perpendicular
        for (var k = 0; k < p.word.length; k++) {
          var cellLetter = p.word[k];
          var cellR = p.row + pdr * k, cellC = p.col + pdc * k;
          for (var i = 0; i < entry.word.length; i++) {
            if (entry.word[i] !== cellLetter) continue;
            var sr = cellR - dr * i, sc = cellC - dc * i;
            var crosses = cwCanPlace(grid, size, entry.word, sr, sc, dr, dc, true);
            if (crosses < 0) continue;
            var centerDist = Math.abs(sr + dr * entry.word.length / 2 - size / 2) +
                             Math.abs(sc + dc * entry.word.length / 2 - size / 2);
            var score = crosses * 100 - centerDist;
            if (!best || score > best.score) {
              best = { row: sr, col: sc, dr: dr, dc: dc, score: score };
            }
          }
        }
      });
      if (!best) return false;
      cwPut(grid, entry.word, best.row, best.col, best.dr, best.dc);
      placements.push({
        word: entry.word, clue: entry.clue, row: best.row, col: best.col,
        dir: best.dr === 0 ? 'A' : 'D'
      });
      placedWords[entry.word] = true;
      return true;
    }

    if (entries.length) placeFirst(entries[0]);
    // two passes so words that failed early can cross words placed later
    for (var pass = 0; pass < 2; pass++) {
      entries.forEach(function (e) {
        if (!placedWords[e.word]) tryPlace(e);
      });
    }
    var unplaced = entries.filter(function (e) { return !placedWords[e.word]; })
      .map(function (e) { return e.word; });

    // trim grid to bounding box of letters
    var minR = size, maxR = -1, minC = size, maxC = -1;
    for (var r2 = 0; r2 < size; r2++) {
      for (var c2 = 0; c2 < size; c2++) {
        if (grid[r2][c2]) {
          if (r2 < minR) minR = r2; if (r2 > maxR) maxR = r2;
          if (c2 < minC) minC = c2; if (c2 > maxC) maxC = c2;
        }
      }
    }
    if (maxR < 0) { // nothing placed (no entries)
      return { grid: [], rows: 0, cols: 0, placements: [], across: [], down: [], unplaced: unplaced };
    }
    var rows = maxR - minR + 1, cols = maxC - minC + 1;
    var trimmed = [];
    for (var r3 = minR; r3 <= maxR; r3++) trimmed.push(grid[r3].slice(minC, maxC + 1));
    placements.forEach(function (p) { p.row -= minR; p.col -= minC; });

    // numbering: a start cell gets the next number if it begins an Across and/or Down word
    var startKeys = {};
    placements.forEach(function (p) { startKeys[p.row + ',' + p.col] = true; });
    var numbers = {}, n = 0;
    for (var r4 = 0; r4 < rows; r4++) {
      for (var c4 = 0; c4 < cols; c4++) {
        if (startKeys[r4 + ',' + c4]) { n++; numbers[r4 + ',' + c4] = n; }
      }
    }
    placements.forEach(function (p) { p.number = numbers[p.row + ',' + p.col]; });
    var across = placements.filter(function (p) { return p.dir === 'A'; })
      .sort(function (a, b) { return a.number - b.number; });
    var down = placements.filter(function (p) { return p.dir === 'D'; })
      .sort(function (a, b) { return a.number - b.number; });

    return {
      grid: trimmed, rows: rows, cols: cols,
      placements: placements, across: across, down: down,
      numbers: numbers, unplaced: unplaced
    };
  }

  /* ---------------- Sudoku ---------------- */

  function sudokuValidPlacement(g, r, c, v) {
    for (var i = 0; i < 9; i++) {
      if (g[r][i] === v || g[i][c] === v) return false;
    }
    var br = r - (r % 3), bc = c - (c % 3);
    for (var i2 = 0; i2 < 3; i2++) {
      for (var j = 0; j < 3; j++) {
        if (g[br + i2][bc + j] === v) return false;
      }
    }
    return true;
  }

  function sudokuIsSolvedValid(g) {
    function unitOk(vals) {
      var s = {};
      for (var i = 0; i < 9; i++) {
        if (vals[i] < 1 || vals[i] > 9 || s[vals[i]]) return false;
        s[vals[i]] = true;
      }
      return true;
    }
    for (var i = 0; i < 9; i++) {
      if (!unitOk(g[i])) return false;
      var col = [];
      for (var r = 0; r < 9; r++) col.push(g[r][i]);
      if (!unitOk(col)) return false;
      var box = [], br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;
      for (var r2 = 0; r2 < 3; r2++) {
        for (var c2 = 0; c2 < 3; c2++) box.push(g[br + r2][bc + c2]);
      }
      if (!unitOk(box)) return false;
    }
    return true;
  }

  // Count solutions, stopping at `cap`. Returns min(actual, cap).
  function sudokuCountSolutions(input, cap) {
    cap = cap || 2;
    var g = input.map(function (row) { return row.slice(); });
    // reject contradictory givens
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var v = g[r][c];
        if (v) {
          g[r][c] = 0;
          if (!sudokuValidPlacement(g, r, c, v)) return 0;
          g[r][c] = v;
        }
      }
    }
    var count = 0;
    function dfs() {
      if (count >= cap) return;
      // pick empty cell with fewest candidates (MRV)
      var bestR = -1, bestC = -1, bestOpts = null;
      for (var r2 = 0; r2 < 9; r2++) {
        for (var c2 = 0; c2 < 9; c2++) {
          if (g[r2][c2] === 0) {
            var opts = [];
            for (var v2 = 1; v2 <= 9; v2++) {
              if (sudokuValidPlacement(g, r2, c2, v2)) opts.push(v2);
            }
            if (opts.length === 0) return;
            if (!bestOpts || opts.length < bestOpts.length) {
              bestR = r2; bestC = c2; bestOpts = opts;
              if (opts.length === 1) break;
            }
          }
        }
        if (bestOpts && bestOpts.length === 1) break;
      }
      if (bestR === -1) { count++; return; }
      for (var k = 0; k < bestOpts.length; k++) {
        g[bestR][bestC] = bestOpts[k];
        dfs();
        g[bestR][bestC] = 0;
        if (count >= cap) return;
      }
    }
    dfs();
    return count;
  }

  function sudokuFullGrid(rng) {
    var g = [];
    for (var r = 0; r < 9; r++) g.push(new Array(9).fill(0));
    function fill(pos) {
      if (pos === 81) return true;
      var rr = Math.floor(pos / 9), cc = pos % 9;
      var nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
      for (var i = 0; i < 9; i++) {
        if (sudokuValidPlacement(g, rr, cc, nums[i])) {
          g[rr][cc] = nums[i];
          if (fill(pos + 1)) return true;
          g[rr][cc] = 0;
        }
      }
      return false;
    }
    fill(0);
    return g;
  }

  var SUDOKU_REMOVALS = { easy: 40, medium: 50, hard: 58 };

  function generateSudoku(difficulty, rng) {
    rng = rng || Math.random;
    var target = SUDOKU_REMOVALS[difficulty] || SUDOKU_REMOVALS.medium;
    var best = null;
    // up to 3 fresh grids; keep the one that dug the most holes
    for (var attempt = 0; attempt < 3; attempt++) {
      var solution = sudokuFullGrid(rng);
      var puzzle = solution.map(function (row) { return row.slice(); });
      var positions = shuffle(
        Array.from({ length: 81 }, function (_, i) { return i; }), rng);
      var removed = 0;
      for (var k = 0; k < positions.length && removed < target; k++) {
        var pos = positions[k];
        var r = Math.floor(pos / 9), c = pos % 9;
        var backup = puzzle[r][c];
        puzzle[r][c] = 0;
        if (sudokuCountSolutions(puzzle, 2) === 1) {
          removed++;
        } else {
          puzzle[r][c] = backup;
        }
      }
      var givens = 81 - removed;
      if (!best || givens < best.givens) {
        best = { puzzle: puzzle, solution: solution, givens: givens, difficulty: difficulty };
      }
      if (removed >= target) break;
    }
    return best;
  }

  /* ---------------- Maze ---------------- */

  // wall bits per cell: N=1, E=2, S=4, W=8 (bit set = wall present)
  var MAZE_DIRS = [
    { bit: 1, opp: 4, dr: -1, dc: 0 },
    { bit: 2, opp: 8, dr: 0, dc: 1 },
    { bit: 4, opp: 1, dr: 1, dc: 0 },
    { bit: 8, opp: 2, dr: 0, dc: -1 }
  ];

  function generateMaze(cols, rows, rng) {
    rng = rng || Math.random;
    cols = Math.max(3, cols | 0); rows = Math.max(3, rows | 0);
    var total = cols * rows;
    var walls = new Array(total).fill(15);
    var visited = new Array(total).fill(false);
    var stack = [0];
    visited[0] = true;
    while (stack.length) {
      var cur = stack[stack.length - 1];
      var cr = Math.floor(cur / cols), cc = cur % cols;
      var options = [];
      MAZE_DIRS.forEach(function (d) {
        var nr = cr + d.dr, nc = cc + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr * cols + nc]) {
          options.push({ d: d, idx: nr * cols + nc });
        }
      });
      if (!options.length) { stack.pop(); continue; }
      var chosen = options[randInt(rng, options.length)];
      walls[cur] &= ~chosen.d.bit;
      walls[chosen.idx] &= ~chosen.d.opp;
      visited[chosen.idx] = true;
      stack.push(chosen.idx);
    }
    return { cols: cols, rows: rows, walls: walls };
  }

  function solveMaze(maze) {
    var cols = maze.cols, rows = maze.rows, walls = maze.walls;
    var total = cols * rows;
    var prev = new Array(total).fill(-1);
    var seen = new Array(total).fill(false);
    var queue = [0];
    seen[0] = true;
    var goal = total - 1;
    while (queue.length) {
      var cur = queue.shift();
      if (cur === goal) break;
      var cr = Math.floor(cur / cols), cc = cur % cols;
      for (var i = 0; i < 4; i++) {
        var d = MAZE_DIRS[i];
        if (walls[cur] & d.bit) continue; // wall blocks
        var nr = cr + d.dr, nc = cc + d.dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        var nIdx = nr * cols + nc;
        if (!seen[nIdx]) { seen[nIdx] = true; prev[nIdx] = cur; queue.push(nIdx); }
      }
    }
    if (!seen[goal]) return null;
    var path = [];
    var cur2 = goal;
    while (cur2 !== -1) { path.push(cur2); cur2 = prev[cur2]; }
    path.reverse();
    return path;
  }

  /* ---------------- Mystery (whodunit logic-grid) ---------------- */
  /*
   * A case: one setting, a victim, N suspects, N weapons, N rooms.
   * Hidden truth = two permutations (which suspect had which weapon,
   * which suspect was in which room) plus a designated culprit.
   * Clues are structured objects {type, ..., text}; every clue is
   * generated FROM the hidden assignment (so it is true by
   * construction) and re-verified with mysteryClueHolds. The clue set
   * is then chosen greedily so that solveMystery() — a full
   * enumeration of the permutation space — finds EXACTLY ONE
   * solution, and that solution is checked to be the hidden
   * assignment before the case is returned. Uniqueness is therefore
   * guaranteed, never hoped for.
   */

  var MYSTERY_SETTINGS = [
    {
      name: 'Blackwood Manor',
      caseTitle: 'The Blackwood Manor Case',
      victim: 'Lord Henry Blackwood',
      intro: 'Lord Henry Blackwood was found dead in Blackwood Manor shortly after midnight, ' +
        'at the end of a dinner party held to announce changes to his will. The doors were ' +
        'locked from the inside, and no one could have left the house.',
      suspects: [
        { name: 'Mrs. Eleanor Vane', desc: "the victim's sister-in-law, twice passed over in his will" },
        { name: 'Colonel Arthur Brandt', desc: 'a retired army friend who owed the victim a large debt' },
        { name: 'Miss Clara Whitfield', desc: "the victim's secretary, keeper of all his private papers" },
        { name: 'Dr. Felix Marlowe', desc: 'the family physician, called to the house that evening' },
        { name: 'Mr. Tobias Grey', desc: 'a business partner whose company the victim was about to dissolve' }
      ],
      weapons: ['Candlestick', 'Revolver', 'Rope', 'Lead Pipe', 'Dagger'],
      rooms: ['Library', 'Study', 'Conservatory', 'Billiard Room', 'Dining Room']
    },
    {
      name: 'The Night Train to Vienna',
      caseTitle: 'The Night Train Case',
      victim: 'Madame Olga Petrovna',
      intro: 'Madame Olga Petrovna, a retired opera singer travelling with a famous emerald, ' +
        'was found dead aboard the night train to Vienna. The train had not stopped since ' +
        'midnight, so the culprit was still in the first-class carriage.',
      suspects: [
        { name: 'Mr. Henri Fabre', desc: 'a jewel dealer who had appraised the emerald that week' },
        { name: 'Miss Ingrid Halvorsen', desc: "the victim's travelling companion and former understudy" },
        { name: 'Mr. Stefan Kovac', desc: 'a quiet engineer sharing the first-class carriage' },
        { name: 'Mrs. Beatrice Lang', desc: 'a novelist gathering material for a crime story' },
        { name: 'Mr. Yusuf Demir', desc: 'the sleeping-car attendant on duty that night' }
      ],
      weapons: ['Letter Opener', 'Silk Cord', 'Poison Flask', 'Revolver', 'Brass Lamp'],
      rooms: ['Sleeper Cabin', 'Dining Car', 'Observation Car', 'Luggage Van', 'Smoking Car']
    },
    {
      name: 'The Grand Palms Hotel',
      caseTitle: 'The Grand Palms Hotel Case',
      victim: 'Mr. Reginald Pierce',
      intro: 'Mr. Reginald Pierce, a property tycoon, was found dead at the Grand Palms Hotel ' +
        'in the early hours after the summer ball. The hotel register showed exactly who ' +
        'had been inside the building all night.',
      suspects: [
        { name: 'Miss Vivienne Cross', desc: 'a singer engaged for the season at the hotel' },
        { name: 'Mr. Douglas Hale', desc: 'the hotel manager, whose books the victim had demanded to audit' },
        { name: 'Mrs. Constance Reid', desc: 'a wealthy widow and long-standing guest of the hotel' },
        { name: 'Mr. Marco Bellini', desc: 'the head chef, dismissed by the victim that very morning' },
        { name: 'Miss Harriet Bloom', desc: 'a journalist staying at the hotel under a false name' }
      ],
      weapons: ['Fire Poker', 'Broken Bottle', 'Silk Scarf', 'Revolver', 'Marble Paperweight'],
      rooms: ['Ballroom', 'Terrace', 'Lobby', 'Spa', 'Penthouse Suite']
    },
    {
      name: 'The Ashworth Museum',
      caseTitle: 'The Ashworth Museum Case',
      victim: 'Professor Edmund Ashworth',
      intro: 'Professor Edmund Ashworth, founder of the Ashworth Museum, was found dead among ' +
        'the exhibits on the night of the annual gala. The alarm had been set at midnight, ' +
        'so the culprit was one of the few people still inside.',
      suspects: [
        { name: 'Dr. Miriam Solano', desc: 'the curator of antiquities, passed over for the directorship' },
        { name: 'Mr. Nathaniel Pryce', desc: 'an art dealer whose prize exhibit the victim had called a forgery' },
        { name: 'Miss Odette Marchand', desc: 'a restorer who worked alone in the galleries at night' },
        { name: 'Mr. Silas Thorne', desc: 'the night watchman, employed at the museum for thirty years' },
        { name: 'Mrs. Helena Voss', desc: 'a patron whose large donation the victim had publicly refused' }
      ],
      weapons: ['Bronze Statuette', 'Ceremonial Dagger', 'Velvet Cord', 'Poisoned Wine', 'Antique Pistol'],
      rooms: ['Egyptian Gallery', 'Sculpture Hall', 'Library Wing', 'Rooftop Garden', 'Vault Room']
    },
    {
      name: 'The Royal Theatre',
      caseTitle: 'The Royal Theatre Case',
      victim: 'Mr. Sebastian Crowe',
      intro: 'Mr. Sebastian Crowe, the leading actor of the Royal Theatre, was found dead in ' +
        'the wings minutes before the curtain rose on opening night. The performance was ' +
        'cancelled, and nobody was allowed to leave the building.',
      suspects: [
        { name: 'Miss Rosalind Fair', desc: 'the leading lady, whose role the victim had tried to give away' },
        { name: 'Mr. Victor Hale', desc: 'the director, locked in a public feud with the victim' },
        { name: 'Mrs. Agnes Pruitt', desc: 'the costume mistress, at the theatre for forty years' },
        { name: 'Mr. Leo Marchetti', desc: 'the understudy, still waiting for his first big break' },
        { name: 'Miss Daphne Wren', desc: 'the stage manager, who knew every corner of the building' }
      ],
      weapons: ['Stage Dagger', 'Curtain Cord', 'Brass Candelabra', 'Poisoned Snuffbox', 'Fire Iron'],
      rooms: ['Stage', 'Dressing Room', 'Orchestra Pit', 'Box Office', 'Green Room']
    }
  ];

  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1));
      permutations(rest).forEach(function (p) { out.push([arr[i]].concat(p)); });
    }
    return out;
  }

  /* Which suspect holds `weapon` in assignment a ({weaponOf, roomOf})? */
  function mysteryHolderOf(a, weapon) {
    for (var name in a.weaponOf) {
      if (a.weaponOf[name] === weapon) return name;
    }
    return null;
  }

  /* The single source of truth for clue semantics. */
  function mysteryClueHolds(clue, a) {
    switch (clue.type) {
      case 'room_is': return a.roomOf[clue.suspect] === clue.room;
      case 'room_not': return a.roomOf[clue.suspect] !== clue.room;
      case 'weapon_is': return a.weaponOf[clue.suspect] === clue.weapon;
      case 'weapon_not': return a.weaponOf[clue.suspect] !== clue.weapon;
      case 'weapon_room_is': return a.roomOf[mysteryHolderOf(a, clue.weapon)] === clue.room;
      case 'weapon_room_not': return a.roomOf[mysteryHolderOf(a, clue.weapon)] !== clue.room;
      case 'either_room':
        return a.roomOf[clue.suspect] === clue.rooms[0] ||
               a.roomOf[clue.suspect] === clue.rooms[1];
      case 'either_weapon':
        return a.weaponOf[clue.suspect] === clue.weapons[0] ||
               a.weaponOf[clue.suspect] === clue.weapons[1];
    }
    return false;
  }

  function allMysteryAssignments(names, weapons, rooms) {
    var wPerms = permutations(weapons), rPerms = permutations(rooms);
    var out = [];
    wPerms.forEach(function (wp) {
      rPerms.forEach(function (rp) {
        var weaponOf = {}, roomOf = {};
        names.forEach(function (n, i) { weaponOf[n] = wp[i]; roomOf[n] = rp[i]; });
        out.push({ weaponOf: weaponOf, roomOf: roomOf });
      });
    });
    return out;
  }

  /*
   * Full enumeration solver: returns up to `cap` assignments that
   * satisfy every clue. Callers pass cap=2 to test uniqueness.
   */
  function solveMystery(names, weapons, rooms, clues, cap) {
    cap = cap || 2;
    var all = allMysteryAssignments(names, weapons, rooms);
    var sols = [];
    for (var i = 0; i < all.length && sols.length < cap; i++) {
      var ok = true;
      for (var j = 0; j < clues.length; j++) {
        if (!mysteryClueHolds(clues[j], all[i])) { ok = false; break; }
      }
      if (ok) sols.push(all[i]);
    }
    return sols;
  }

  function sameAssignment(a, b, names) {
    for (var i = 0; i < names.length; i++) {
      if (a.weaponOf[names[i]] !== b.weaponOf[names[i]]) return false;
      if (a.roomOf[names[i]] !== b.roomOf[names[i]]) return false;
    }
    return true;
  }

  /*
   * Build the pool of candidate clues for a hidden assignment.
   * Every clue is constructed to be true, then filtered through
   * mysteryClueHolds anyway (defence in depth) and de-duplicated.
   */
  function buildMysteryCandidates(names, weapons, rooms, a) {
    var raw = [];
    function add(clue) { raw.push(clue); }
    names.forEach(function (s) {
      var myRoom = a.roomOf[s], myWeapon = a.weaponOf[s];
      add({ type: 'room_is', suspect: s, room: myRoom,
        text: s + ' was in the ' + myRoom + '.' });
      add({ type: 'weapon_is', suspect: s, weapon: myWeapon,
        text: s + ' had the ' + myWeapon + '.' });
      rooms.forEach(function (r) {
        if (r === myRoom) return;
        add({ type: 'room_not', suspect: s, room: r,
          text: s + ' was not in the ' + r + '.' });
        add({ type: 'either_room', suspect: s, rooms: [myRoom, r],
          text: s + ' was in either the ' + myRoom + ' or the ' + r + '.' });
      });
      weapons.forEach(function (w) {
        if (w === myWeapon) return;
        add({ type: 'weapon_not', suspect: s, weapon: w,
          text: s + ' did not have the ' + w + '.' });
        add({ type: 'either_weapon', suspect: s, weapons: [myWeapon, w],
          text: s + ' had either the ' + myWeapon + ' or the ' + w + '.' });
      });
    });
    weapons.forEach(function (w) {
      var holder = mysteryHolderOf(a, w);
      var holderRoom = a.roomOf[holder];
      add({ type: 'weapon_room_is', weapon: w, room: holderRoom,
        text: 'The suspect with the ' + w + ' was in the ' + holderRoom + '.' });
      rooms.forEach(function (r) {
        if (r === holderRoom) return;
        add({ type: 'weapon_room_not', weapon: w, room: r,
          text: 'The suspect with the ' + w + ' was not in the ' + r + '.' });
      });
    });
    var seenText = {}, pool = [];
    raw.forEach(function (clue) {
      if (seenText[clue.text]) return;
      if (!mysteryClueHolds(clue, a)) return; // must be true — guaranteed, but verify
      seenText[clue.text] = true;
      pool.push(clue);
    });
    return pool;
  }

  function generateMystery(rng, opts) {
    rng = rng || Math.random;
    opts = opts || {};
    var size = opts.size === 5 ? 5 : 4;
    var MIN_CLUES = 6, MAX_CLUES = 10;

    for (var attempt = 0; attempt < 8; attempt++) {
      var setting = pick(rng, MYSTERY_SETTINGS);
      var suspects = shuffle(setting.suspects.slice(), rng).slice(0, size);
      var weapons = shuffle(setting.weapons.slice(), rng).slice(0, size);
      var rooms = shuffle(setting.rooms.slice(), rng).slice(0, size);
      var names = suspects.map(function (s) { return s.name; });

      // hidden truth: two random permutations + a designated culprit
      var wPerm = shuffle(weapons.slice(), rng);
      var rPerm = shuffle(rooms.slice(), rng);
      var assignment = { weaponOf: {}, roomOf: {} };
      names.forEach(function (n, i) {
        assignment.weaponOf[n] = wPerm[i];
        assignment.roomOf[n] = rPerm[i];
      });
      var culprit = pick(rng, names);

      var pool = buildMysteryCandidates(names, weapons, rooms, assignment);
      var all = allMysteryAssignments(names, weapons, rooms);

      // Bitmask per candidate over the assignment space, so greedy
      // selection stays fast even at size 5 (120 x 120 assignments).
      var masks = pool.map(function (clue) {
        var m = new Uint8Array(all.length);
        for (var i = 0; i < all.length; i++) {
          m[i] = mysteryClueHolds(clue, all[i]) ? 1 : 0;
        }
        return m;
      });
      function countWith(base, extra) {
        var cnt = 0;
        for (var i = 0; i < all.length; i++) {
          if (base[i] && (extra === null || extra[i])) cnt++;
        }
        return cnt;
      }

      var current = new Uint8Array(all.length).fill(1);
      var remaining = all.length;
      var usedIdx = {};
      var chosenIdx = [];

      // Greedy: repeatedly add the true clue that eliminates the
      // most remaining candidate assignments, until one is left.
      while (remaining > 1) {
        var best = -1, bestCount = Infinity;
        for (var ci = 0; ci < pool.length; ci++) {
          if (usedIdx[ci]) continue;
          var cnt = countWith(current, masks[ci]);
          if (cnt >= 1 && cnt < bestCount) { bestCount = cnt; best = ci; }
        }
        if (best === -1 || bestCount >= remaining) break; // no progress (should not happen)
        usedIdx[best] = true;
        chosenIdx.push(best);
        for (var k = 0; k < all.length; k++) current[k] = current[k] && masks[best][k] ? 1 : 0;
        remaining = bestCount;
      }
      if (remaining !== 1) continue; // try a fresh case

      // Top up to at least MIN_CLUES with the most restrictive
      // remaining true clues (keeps the set feeling substantial).
      while (chosenIdx.length < MIN_CLUES) {
        var addBest = -1, addCount = Infinity;
        for (var cj = 0; cj < pool.length; cj++) {
          if (usedIdx[cj]) continue;
          var own = 0;
          for (var q = 0; q < all.length; q++) if (masks[cj][q]) own++;
          if (own < addCount) { addCount = own; addBest = cj; }
        }
        if (addBest === -1) break;
        usedIdx[addBest] = true;
        chosenIdx.push(addBest);
      }

      // Trim: drop any clue whose removal keeps the solution unique,
      // without going below MIN_CLUES — leaves a lean, necessary-ish set.
      var trimmed = true;
      while (trimmed && chosenIdx.length > MIN_CLUES) {
        trimmed = false;
        for (var ti = 0; ti < chosenIdx.length; ti++) {
          var testMask = new Uint8Array(all.length).fill(1);
          chosenIdx.forEach(function (ix, pos) {
            if (pos === ti) return;
            var mk = masks[ix];
            for (var z = 0; z < all.length; z++) testMask[z] = testMask[z] && mk[z] ? 1 : 0;
          });
          if (countWith(testMask, null) === 1) {
            chosenIdx.splice(ti, 1);
            trimmed = true;
            break;
          }
        }
      }
      if (chosenIdx.length > MAX_CLUES) continue; // unusually wordy — regenerate

      var clues = chosenIdx.map(function (ix) { return pool[ix]; });

      // Final guarantee: the shipped solver must find exactly one
      // solution, and it must be the hidden assignment.
      var sols = solveMystery(names, weapons, rooms, clues, 2);
      if (sols.length !== 1 || !sameAssignment(sols[0], assignment, names)) continue;

      shuffle(clues, rng); // presentation order

      var nameList = names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
      var story = setting.intro + ' The only people who could have done it were ' +
        nameList + '. Each suspect had one of the weapons and was in one of the rooms. ' +
        'Use the clues to work out who the culprit is, what they used, and where they were.';

      return {
        title: setting.caseTitle,
        setting: setting.name,
        victim: setting.victim,
        story: story,
        suspects: suspects,
        weapons: weapons,
        rooms: rooms,
        clues: clues,
        solution: {
          culprit: culprit,
          weapon: assignment.weaponOf[culprit],
          room: assignment.roomOf[culprit]
        },
        assignment: assignment
      };
    }
    throw new Error('generateMystery: could not build a unique-solution case');
  }

  /* ---------------- Exports ---------------- */

  var PG = {
    makeRng: makeRng,
    shuffle: shuffle,
    cleanWord: cleanWord,
    WORD_THEMES: WORD_THEMES,
    CROSSWORD_EXAMPLE: CROSSWORD_EXAMPLE,
    generateWordSearch: generateWordSearch,
    generateCrossword: generateCrossword,
    generateSudoku: generateSudoku,
    sudokuCountSolutions: sudokuCountSolutions,
    sudokuIsSolvedValid: sudokuIsSolvedValid,
    SUDOKU_REMOVALS: SUDOKU_REMOVALS,
    generateMaze: generateMaze,
    solveMaze: solveMaze,
    MYSTERY_SETTINGS: MYSTERY_SETTINGS,
    generateMystery: generateMystery,
    solveMystery: solveMystery,
    mysteryClueHolds: mysteryClueHolds,
    mysteryHolderOf: mysteryHolderOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PG;
  global.PG = PG;
})(typeof window !== 'undefined' ? window : globalThis);
