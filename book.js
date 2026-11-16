/*
 * Songlap Puzzle Book Generator — Book Builder.
 * Generates a complete print-ready book (title page, puzzle pages,
 * solutions section) and renders it into #book-preview, which is what
 * the browser prints. @page size is set to the chosen KDP trim size.
 */
(function () {
  'use strict';

  var TRIMS = {
    '8.5x11': { w: 8.5, h: 11, label: '8.5 × 11 in', pad: 0.65 },
    '8x10': { w: 8, h: 10, label: '8 × 10 in', pad: 0.6 },
    '6x9': { w: 6, h: 9, label: '6 × 9 in', pad: 0.5 }
  };

  var INSTRUCTIONS = {
    ws: 'Find all the listed words hidden in the grid. Words can run forwards, backwards, up, down or diagonally.',
    cw: 'Fill the grid using the clues. Answers read Across and Down.',
    su: 'Fill every row, column and 3 × 3 box with the numbers 1–9, using each number once per row, column and box.',
    mz: 'Draw a path from the green start dot (top-left) to the red finish dot (bottom-right) without crossing any wall.',
    my: 'Read the case, then use the clues to find the culprit, their weapon and their room. Mark ✓ or ✗ in the grids as you eliminate suspects.'
  };
  var TYPE_TITLES = { ws: 'Word Search', cw: 'Crossword', su: 'Sudoku', mz: 'Maze', my: 'Mystery Case' };

  function $(id) { return document.getElementById(id); }

  function init(seedRng) {
    AppUtil.fillThemeSelect($('bk-ws-theme'), true);
    // The Book Builder has no custom-words box (that lives on the Word
    // Search tab), so drop the "Custom words" option here — leaving it
    // would silently build the book with the Animals theme instead.
    var themeSel = $('bk-ws-theme');
    var customOpt = themeSel.querySelector
      ? themeSel.querySelector('option[value="__custom"]') : null;
    if (customOpt) customOpt.remove();
    themeSel.value = '__mixed';
    $('bk-build').addEventListener('click', function () { buildBook(seedRng); });
    $('bk-print').addEventListener('click', function () { window.print(); });
  }

  function clampCount(v) {
    var n = parseInt(v, 10);
    if (isNaN(n) || n < 0) return 0;
    return Math.min(n, 100);
  }

  function buildBook(seedRng) {
    var title = $('bk-title').value.trim() || 'The Big Book of Puzzles';
    var author = $('bk-author').value.trim();
    var trim = TRIMS[$('bk-trim').value] || TRIMS['8.5x11'];
    var counts = {
      ws: clampCount($('bk-count-ws').value),
      cw: clampCount($('bk-count-cw').value),
      su: clampCount($('bk-count-su').value),
      mz: clampCount($('bk-count-mz').value),
      my: clampCount($('bk-count-my').value)
    };
    var total = counts.ws + counts.cw + counts.su + counts.mz + counts.my;
    if (total === 0) {
      $('bk-status').textContent = 'Set at least one puzzle count above zero.';
      return;
    }
    $('bk-status').textContent = 'Building your book…';
    $('bk-build').disabled = true;

    // generate after a paint so the status shows (sudoku digging is sync)
    setTimeout(function () {
      try {
        var rng = seedRng();
        var puzzles = []; // {type, data, label}
        var themeNames = Object.keys(PG.WORD_THEMES);
        var themeChoice = $('bk-ws-theme').value;
        var suChoice = $('bk-su-difficulty').value;
        var suCycle = ['easy', 'medium', 'hard'];
        var mzSizes = [21, 15, 31, 21, 25];
        // One grid size at every trim. The page fit at the small trims is
        // handled by the compact book word list in styles.css, not by
        // shrinking the puzzle.
        var wsSize = 15;

        var i, theme, diff;
        for (i = 0; i < counts.ws; i++) {
          theme = themeChoice === '__mixed'
            ? themeNames[i % themeNames.length]
            : (themeChoice === '__custom' ? 'Animals' : themeChoice);
          puzzles.push({
            type: 'ws', label: theme + ' Word Search',
            data: PG.generateWordSearch(PG.WORD_THEMES[theme], wsSize, rng)
          });
        }
        for (i = 0; i < counts.cw; i++) {
          // vary each crossword: drop a few random entries so layouts differ
          var entries = PG.CROSSWORD_EXAMPLE.slice();
          PG.shuffle(entries, rng);
          var subset = entries.slice(0, Math.max(9, entries.length - (i % 3)));
          var cw = PG.generateCrossword(subset, rng);
          if (cw.placements.length < 6) cw = PG.generateCrossword(PG.CROSSWORD_EXAMPLE, rng);
          puzzles.push({ type: 'cw', label: 'Crossword', data: cw });
        }
        for (i = 0; i < counts.su; i++) {
          diff = suChoice === 'mixed' ? suCycle[i % 3] : suChoice;
          puzzles.push({
            type: 'su', label: 'Sudoku (' + diff + ')',
            data: PG.generateSudoku(diff, rng)
          });
        }
        for (i = 0; i < counts.mz; i++) {
          var size = mzSizes[i % mzSizes.length];
          puzzles.push({
            type: 'mz', label: 'Maze',
            data: PG.generateMaze(size, size, rng)
          });
        }
        for (i = 0; i < counts.my; i++) {
          var myCase = PG.generateMystery(rng);
          puzzles.push({ type: 'my', label: myCase.title, data: myCase });
        }

        var pageCount = renderBook(title, author, trim, puzzles);
        $('bk-print').disabled = false;
        $('bk-status').textContent = 'Book ready: ' + puzzles.length + ' puzzles, ' +
          pageCount + ' pages total (title + puzzle pages + solutions divider + solution pages). ' +
          'Scroll down to preview, then click Download / Print PDF.';
        $('bk-output').innerHTML = '<p class="placeholder">✅ Book generated — preview is below the tool. ' +
          'Click <strong>Download / Print PDF</strong> to save it at ' + trim.label + '.</p>';
      } catch (err) {
        $('bk-status').textContent = 'Something went wrong while building the book: ' + err.message;
      } finally {
        $('bk-build').disabled = false;
      }
    }, 30);
  }

  function puzzleBody(p, solution) {
    switch (p.type) {
      case 'ws':
        return Render.wordSearchHTML(p.data, { solution: solution }) +
          (solution ? '' : Render.wordListHTML(p.data));
      case 'cw':
        return Render.crosswordHTML(p.data, { solution: solution }) +
          (solution ? '' : Render.clueListsHTML(p.data));
      case 'su':
        return Render.sudokuHTML(p.data, { solution: solution }) +
          '<p class="puzzle-meta">' + p.data.givens + ' clues · unique solution</p>';
      case 'mz':
        return Render.mazeSVG(p.data, { solution: solution });
      case 'my':
        return solution ? Render.mysteryAnswerHTML(p.data)
                        : Render.mysteryHTML(p.data, {});
    }
    return '';
  }

  function renderBook(title, author, trim, puzzles) {
    // @page rule for the chosen trim size
    var old = document.getElementById('page-style');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = 'page-style';
    st.textContent = '@page { size: ' + trim.w + 'in ' + trim.h + 'in; margin: 0; }';
    document.head.appendChild(st);

    var pageStyle = 'width:' + trim.w + 'in;height:' + trim.h + 'in;padding:' + trim.pad + 'in;';
    // Size class for trim-specific type tightening in styles.css
    // (the 6 x 9 mystery story page needs it — see .trim-s rules).
    var trimCls = trim.w < 7 ? 'trim-s' : (trim.w < 8.5 ? 'trim-m' : 'trim-l');
    var pages = [];

    // title page
    pages.push(
      '<div class="book-page cover-page ' + trimCls + '" style="' + pageStyle + '">' +
        '<div class="cover-inner">' +
          '<div class="cover-puzzle-icon">🧩</div>' +
          '<h1 class="cover-title">' + Render.esc(title) + '</h1>' +
          (author ? '<p class="cover-author">by ' + Render.esc(author) + '</p>' : '') +
          '<p class="cover-count">' + puzzles.length + ' puzzles with solutions</p>' +
          '<p class="cover-brand">SONGLAP</p>' +
        '</div>' +
      '</div>');

    function pageShell(heading, instructions, bodyHtml, footerText) {
      return '<div class="book-page ' + trimCls + '" style="' + pageStyle + '">' +
        '<h2 class="page-title">' + heading + '</h2>' +
        (instructions ? '<p class="page-instructions">' + instructions + '</p>' : '') +
        '<div class="page-body">' + bodyHtml + '</div>' +
        '<p class="page-footer">' + footerText + '</p></div>';
    }

    // puzzle pages (a mystery case spans two pages: story, then clues + grids)
    puzzles.forEach(function (p, idx) {
      var heading = 'Puzzle ' + (idx + 1) + ' — ' + Render.esc(p.label);
      var footer = Render.esc(title) + ' · Puzzle ' + (idx + 1);
      if (p.type === 'my') {
        pages.push(pageShell(heading, INSTRUCTIONS.my,
          Render.mysteryHTML(p.data, { part: 'story' }), footer));
        pages.push(pageShell(heading + ' (continued)', null,
          Render.mysteryHTML(p.data, { part: 'grids' }), footer));
      } else {
        pages.push(pageShell(heading, INSTRUCTIONS[p.type], puzzleBody(p, false), footer));
      }
    });

    // solutions divider
    pages.push(
      '<div class="book-page divider-page ' + trimCls + '" style="' + pageStyle + '">' +
        '<div class="cover-inner"><h1 class="cover-title">Solutions</h1>' +
        '<p class="cover-count">Answers for all ' + puzzles.length + ' puzzles</p></div>' +
      '</div>');

    // solution pages
    puzzles.forEach(function (p, idx) {
      pages.push(
        '<div class="book-page solution-page ' + trimCls + '" style="' + pageStyle + '">' +
          '<h2 class="page-title">Solution — Puzzle ' + (idx + 1) + ' (' + TYPE_TITLES[p.type] + ')</h2>' +
          '<div class="page-body">' + puzzleBody(p, true) + '</div>' +
          '<p class="page-footer">' + Render.esc(title) + ' · Solution ' + (idx + 1) + '</p>' +
        '</div>');
    });

    var preview = $('book-preview');
    preview.innerHTML = pages.join('');
    preview.hidden = false;
    return pages.length;
  }

  window.BookBuilder = { init: init, _renderBook: renderBook };
})();
