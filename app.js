/*
 * ============================================================
 *  Songlap Puzzle Book Generator — main app
 * ============================================================
 *  ACCESS CONTROL CONFIG
 *  ACCESS_CODE_HASH is the SHA-256 hash of the buyer access code.
 *  The plain code is NEVER stored in this file.
 *  >> Set from the plain code at launch; change the code by
 *     replacing this hash with the SHA-256 of the new code. <<
 * ============================================================
 */
const ACCESS_CODE_HASH = 'e7baff636577e7c7520d0370bb1a589e65045d8933cdc412bc6e2ae2f73d9b12';

(function () {
  'use strict';

  /* ---------- SHA-256 (crypto.subtle, with pure-JS fallback for file://) ---------- */

  function sha256Sync(input) {
    // Compact public-domain style SHA-256 (geraintluff algorithm).
    // Input is UTF-8 encoded first so it matches crypto.subtle exactly.
    var ascii = unescape(encodeURIComponent(input));
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var maxWord = Math.pow(2, 32), result = '';
    var words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256Sync.h = sha256Sync.h || [], k = sha256Sync.k = sha256Sync.k || [];
    var primeCounter = k.length, isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (var j = 0; j < ascii.length; j++) {
      var code = ascii.charCodeAt(j) & 0xff;
      words[j >> 2] |= code << ((3 - j) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = asciiBitLength;
    for (var block = 0; block < words.length;) {
      var w = words.slice(block, block += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (var t = 0; t < 64; t++) {
        var w15 = w[t - 15], w2 = w[t - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7] +
          (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) +
          ((e & hash[5]) ^ ((~e) & hash[6])) + k[t] +
          (w[t] = (t < 16) ? w[t] : (
            w[t - 16] +
            (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[t - 7] +
            (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (var u = 0; u < 8; u++) hash[u] = (hash[u] + oldHash[u]) | 0;
    }
    for (var v = 0; v < 8; v++) {
      for (var b = 3; b + 1; b--) {
        var byte = (hash[v] >> (b * 8)) & 255;
        result += ((byte < 16) ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }

  function sha256Hex(text) {
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
        .then(function (buf) {
          return Array.from(new Uint8Array(buf))
            .map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
        });
    }
    return Promise.resolve(sha256Sync(text));
  }

  /* ---------- Access gate ---------- */

  var SESSION_KEY = 'pbg_unlocked';
  var appStarted = false;

  function unlock() {
    document.getElementById('lock-screen').hidden = true;
    document.getElementById('app').hidden = false;
    if (!appStarted) { appStarted = true; initApp(); }
  }

  function initGate() {
    var already = false;
    try { already = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { /* private mode */ }
    if (already) { unlock(); return; }
    document.getElementById('lock-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var code = document.getElementById('lock-input').value.trim();
      if (!code) return;
      sha256Hex(code).then(function (hex) {
        if (hex.toLowerCase() === ACCESS_CODE_HASH.toLowerCase()) {
          try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* ignore */ }
          unlock();
        } else {
          document.getElementById('lock-error').hidden = false;
        }
      });
    });
  }

  /* ---------- App ---------- */

  function $(id) { return document.getElementById(id); }
  function seedRng() { return PG.makeRng((Date.now() ^ (Math.random() * 1e9)) >>> 0); }

  var state = { ws: null, wsShow: false, cw: null, cwShow: false, su: null, suShow: false, mz: null, mzShow: false };

  function initApp() {
    initTabs();
    initWordSearch();
    initCrossword();
    initSudoku();
    initMaze();
    if (window.BookBuilder) BookBuilder.init(seedRng);
    // friendly first screen: pre-generate a word search
    $('ws-generate').click();
  }

  function initTabs() {
    $('tabs').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.tab');
      if (!btn) return;
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(function (p) { p.hidden = true; });
      $('panel-' + btn.dataset.tab).hidden = false;
    });
  }

  /* ----- Word Search ----- */

  function fillThemeSelect(sel, includeMixed) {
    sel.innerHTML = '';
    Object.keys(PG.WORD_THEMES).forEach(function (name) {
      var o = document.createElement('option');
      o.value = name; o.textContent = name + ' (' + PG.WORD_THEMES[name].length + ' words)';
      sel.appendChild(o);
    });
    var custom = document.createElement('option');
    custom.value = '__custom'; custom.textContent = 'Custom words';
    sel.appendChild(custom);
    if (includeMixed) {
      var mixed = document.createElement('option');
      mixed.value = '__mixed'; mixed.textContent = 'Mixed themes (different theme per puzzle)';
      sel.insertBefore(mixed, sel.firstChild);
    }
  }

  function initWordSearch() {
    var sel = $('ws-theme');
    fillThemeSelect(sel, false);
    sel.value = 'Animals';
    $('ws-words').value = PG.WORD_THEMES.Animals.join('\n');
    sel.addEventListener('change', function () {
      if (sel.value !== '__custom') $('ws-words').value = PG.WORD_THEMES[sel.value].join('\n');
    });

    $('ws-generate').addEventListener('click', function () {
      var words = $('ws-words').value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      var size = parseInt($('ws-size').value, 10);
      state.ws = PG.generateWordSearch(words, size, seedRng());
      state.wsShow = false;
      $('ws-solution').disabled = false;
      $('ws-solution').textContent = 'Show Solution';
      $('ws-status').textContent = 'Placed ' + state.ws.placements.length + ' of ' +
        (state.ws.placements.length + state.ws.unplaced.length) + ' words' +
        (state.ws.unplaced.length ? ' — not placed: ' + state.ws.unplaced.join(', ') : '');
      drawWordSearch();
    });

    $('ws-solution').addEventListener('click', function () {
      state.wsShow = !state.wsShow;
      $('ws-solution').textContent = state.wsShow ? 'Hide Solution' : 'Show Solution';
      drawWordSearch();
    });
  }

  function drawWordSearch() {
    if (!state.ws) return;
    $('ws-output').innerHTML =
      Render.wordSearchHTML(state.ws, { solution: state.wsShow }) + Render.wordListHTML(state.ws);
  }

  /* ----- Crossword ----- */

  function parseEntries(text) {
    return text.split(/\r?\n/).map(function (line) {
      var idx = line.indexOf('|');
      if (idx === -1) return null;
      var word = line.slice(0, idx).trim();
      var clue = line.slice(idx + 1).trim();
      return word ? { word: word, clue: clue } : null;
    }).filter(Boolean);
  }

  function exampleText() {
    return PG.CROSSWORD_EXAMPLE.map(function (e) { return e.word + ' | ' + e.clue; }).join('\n');
  }

  function initCrossword() {
    $('cw-entries').value = exampleText();
    $('cw-example').addEventListener('click', function () { $('cw-entries').value = exampleText(); });
    $('cw-generate').addEventListener('click', function () {
      var entries = parseEntries($('cw-entries').value);
      if (entries.length < 2) {
        $('cw-status').textContent = 'Add at least 2 word | clue lines.';
        return;
      }
      state.cw = PG.generateCrossword(entries, seedRng());
      state.cwShow = false;
      $('cw-solution').disabled = false;
      $('cw-solution').textContent = 'Show Solution';
      $('cw-status').textContent = 'Placed ' + state.cw.placements.length + ' of ' + entries.length +
        ' words' + (state.cw.unplaced.length ? ' — not placed: ' + state.cw.unplaced.join(', ') : '');
      drawCrossword();
    });
    $('cw-solution').addEventListener('click', function () {
      state.cwShow = !state.cwShow;
      $('cw-solution').textContent = state.cwShow ? 'Hide Solution' : 'Show Solution';
      drawCrossword();
    });
  }

  function drawCrossword() {
    if (!state.cw) return;
    $('cw-output').innerHTML =
      Render.crosswordHTML(state.cw, { solution: state.cwShow }) + Render.clueListsHTML(state.cw);
  }

  /* ----- Sudoku ----- */

  function initSudoku() {
    $('su-generate').addEventListener('click', function () {
      var diff = $('su-difficulty').value;
      $('su-status').textContent = 'Generating…';
      // let the label paint before the (fast but synchronous) generation
      setTimeout(function () {
        state.su = PG.generateSudoku(diff, seedRng());
        state.suShow = false;
        $('su-solution').disabled = false;
        $('su-solution').textContent = 'Show Solution';
        $('su-status').textContent = 'Difficulty: ' + diff + ' · ' + state.su.givens +
          ' clues given · unique solution guaranteed.';
        drawSudoku();
      }, 10);
    });
    $('su-solution').addEventListener('click', function () {
      state.suShow = !state.suShow;
      $('su-solution').textContent = state.suShow ? 'Hide Solution' : 'Show Solution';
      drawSudoku();
    });
  }

  function drawSudoku() {
    if (!state.su) return;
    $('su-output').innerHTML = Render.sudokuHTML(state.su, { solution: state.suShow });
  }

  /* ----- Maze ----- */

  function initMaze() {
    $('mz-generate').addEventListener('click', function () {
      var size = parseInt($('mz-size').value, 10);
      state.mz = PG.generateMaze(size, size, seedRng());
      state.mzShow = false;
      $('mz-solution').disabled = false;
      $('mz-solution').textContent = 'Show Solution';
      drawMaze();
    });
    $('mz-solution').addEventListener('click', function () {
      state.mzShow = !state.mzShow;
      $('mz-solution').textContent = state.mzShow ? 'Hide Solution' : 'Show Solution';
      drawMaze();
    });
  }

  function drawMaze() {
    if (!state.mz) return;
    $('mz-output').innerHTML = Render.mazeSVG(state.mz, { solution: state.mzShow });
  }

  /* expose helpers for book.js */
  window.AppUtil = { fillThemeSelect: fillThemeSelect, parseEntries: parseEntries, seedRng: seedRng };

  document.addEventListener('DOMContentLoaded', initGate);
})();
