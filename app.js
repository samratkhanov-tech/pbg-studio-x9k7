/*
 * ============================================================
 *  Songlap Puzzle Book Generator — main app
 * ============================================================
 *  LICENSING CONFIG
 *  Each buyer has a UNIQUE code, registered to their name by
 *  the license server (Google Apps Script + Google Sheet —
 *  see license/Code.gs). The app sends { name, code } to
 *  LICENSE_API_URL and unlocks only when the server says ok.
 *  >> After deploying the Apps Script web app, paste its URL
 *     between the quotes below. That is the ONLY change needed
 *     to go live; reset/free codes in the Google Sheet. <<
 * ============================================================
 */
const LICENSE_API_URL = "https://script.google.com/macros/s/AKfycbwJSkfTRL2vwv2idTHUSGqUoEMt2euOYUV_yGE49X3Mlzce0T9ikqPDptIys0wpdDZ1kQ/exec";

/* ---------- License response handling (pure, unit-tested) ---------- */

var LICENSE_ERROR_MESSAGES = {
  invalid_code: 'This code was not found. Please check the code from your purchase.',
  code_registered_to_another_name: 'This code is already registered to another buyer. If this is your code, please contact support.',
  missing_fields: 'Please enter both your name and your code.',
  network: 'Could not verify your code. Please check your internet connection and try again.'
};

function licenseErrorMessage(errorCode) {
  return LICENSE_ERROR_MESSAGES[errorCode] || LICENSE_ERROR_MESSAGES.network;
}

/* Turn a parsed license-server response into an app decision. */
function interpretLicenseResponse(data) {
  if (!data || typeof data !== 'object') {
    return { action: 'error', message: licenseErrorMessage('network') };
  }
  if (data.ok === true) {
    return { action: 'unlock', test: data.test === true };
  }
  return { action: 'error', message: licenseErrorMessage(data.error) };
}

/* Allow the Node test suite to exercise the pure logic above. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LICENSE_API_URL: LICENSE_API_URL,
    LICENSE_ERROR_MESSAGES: LICENSE_ERROR_MESSAGES,
    licenseErrorMessage: licenseErrorMessage,
    interpretLicenseResponse: interpretLicenseResponse
  };
}

(function () {
  'use strict';

  /* ---------- License gate ---------- */

  var NAME_KEY = 'pbg_license_name';
  var CODE_KEY = 'pbg_license_code';
  var appStarted = false;

  function unlock() {
    document.getElementById('lock-screen').hidden = true;
    document.getElementById('app').hidden = false;
    if (!appStarted) { appStarted = true; initApp(); }
  }

  function showLicenseBar(name, code) {
    document.getElementById('license-name').textContent = name;
    document.getElementById('license-code').textContent = code;
    document.getElementById('license-bar').hidden = false;
  }

  function storedLicense() {
    try {
      var name = sessionStorage.getItem(NAME_KEY);
      var code = sessionStorage.getItem(CODE_KEY);
      if (name && code) return { name: name, code: code };
    } catch (e) { /* private mode */ }
    return null;
  }

  function initGate() {
    var saved = storedLicense();
    if (saved) { showLicenseBar(saved.name, saved.code); unlock(); return; }

    var form = document.getElementById('lock-form');
    var nameInput = document.getElementById('lock-name');
    var codeInput = document.getElementById('lock-input');
    var button = document.getElementById('lock-submit');
    var errorEl = document.getElementById('lock-error');

    function showError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    function setChecking(checking) {
      button.disabled = checking;
      nameInput.disabled = checking;
      codeInput.disabled = checking;
      button.textContent = checking ? 'Checking…' : 'Unlock';
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = nameInput.value.trim().replace(/\s+/g, ' ');
      var code = codeInput.value.trim().toUpperCase();
      if (!name || !code) { showError(licenseErrorMessage('missing_fields')); return; }
      errorEl.hidden = true;
      setChecking(true);
      // text/plain keeps this a "simple request" (no CORS preflight),
      // which is what the Apps Script web app expects.
      fetch(LICENSE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ name: name, code: code })
      }).then(function (resp) {
        return resp.json();
      }).then(function (data) {
        var result = interpretLicenseResponse(data);
        setChecking(false);
        if (result.action === 'unlock') {
          try {
            sessionStorage.setItem(NAME_KEY, name);
            sessionStorage.setItem(CODE_KEY, code);
          } catch (e) { /* ignore */ }
          showLicenseBar(name, code);
          unlock();
        } else {
          showError(result.message);
        }
      }).catch(function () {
        setChecking(false);
        showError(licenseErrorMessage('network'));
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
  if (typeof window !== 'undefined') {
    window.AppUtil = { fillThemeSelect: fillThemeSelect, parseEntries: parseEntries, seedRng: seedRng };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initGate);
  }
})();
