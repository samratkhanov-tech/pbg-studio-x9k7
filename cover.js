/*
 * Songlap Puzzle Book Generator — Cover Maker.
 *
 * Designs a commercial-style book cover in the conventions of the
 * bestselling KDP puzzle books: oversized bold title type, high-contrast
 * colour blocking, a circular "N+ PUZZLES!" badge, a puzzle-type line,
 * the buyer's own name as author, a "WITH SOLUTIONS INCLUDED" band, and
 * a puzzle visual (letter grid / sudoku grid / maze / crossword blocks /
 * checkerboard) drawn behind the text. No external images, no faces.
 *
 * coverHTML(settings, ctx) builds the cover markup used as page 1 of the
 * printed book (book.js) and as the live preview on the Cover tab.
 * planCover(settings, trim) builds a pure canvas draw-plan (same style
 * as png.js) for the standalone ~300 DPI PNG export, so the geometry is
 * unit-testable in Node; renderPlan from png.js executes it.
 *
 * Settings persist in localStorage under SETTINGS_KEY.
 */
(function (global) {
  'use strict';

  var SETTINGS_KEY = 'pbg_cover_settings';

  var TRIMS = {
    '8.5x11': { w: 8.5, h: 11, label: '8.5 × 11 in' },
    '8x10': { w: 8, h: 10, label: '8 × 10 in' },
    '6x9': { w: 6, h: 9, label: '6 × 9 in' }
  };

  /* ---------- Themes (modelled on bestseller cover conventions) ---------- */
  var THEMES = {
    midnight: {
      name: 'Midnight Teal',
      bg: 'linear-gradient(150deg, #0f2027 0%, #203a43 55%, #2c5364 100%)',
      bgSolid: '#16262e',
      ink: '#ffffff', sub: 'rgba(255,255,255,0.86)', accent: '#ffd166',
      badge: '#e63946', badgeInk: '#ffffff',
      band: '#ffd166', bandInk: '#14232b',
      patternInk: 'rgba(255,209,102,0.13)', pattern: 'letters'
    },
    crimson: {
      name: 'Crimson Bold',
      bg: 'linear-gradient(160deg, #7f1d1d 0%, #b3001b 55%, #e63946 100%)',
      bgSolid: '#a30018',
      ink: '#ffffff', sub: 'rgba(255,255,255,0.88)', accent: '#ffd166',
      badge: '#ffd166', badgeInk: '#7f1d1d',
      band: '#14232b', bandInk: '#ffd166',
      patternInk: 'rgba(255,255,255,0.12)', pattern: 'sudoku'
    },
    royal: {
      name: 'Royal Purple',
      bg: 'linear-gradient(150deg, #2a0a4a 0%, #3a1c71 55%, #6a3093 100%)',
      bgSolid: '#341a63',
      ink: '#ffffff', sub: 'rgba(255,255,255,0.86)', accent: '#7bf1a8',
      badge: '#ffd166', badgeInk: '#2a0a4a',
      band: '#ffd166', bandInk: '#2a0a4a',
      patternInk: 'rgba(255,255,255,0.10)', pattern: 'maze'
    },
    sunshine: {
      name: 'Sunshine Pop',
      bg: 'linear-gradient(160deg, #ffb703 0%, #fb8500 100%)',
      bgSolid: '#fa9a05',
      ink: '#14232b', sub: 'rgba(20,35,43,0.82)', accent: '#b3001b',
      badge: '#b3001b', badgeInk: '#ffffff',
      band: '#14232b', bandInk: '#ffd166',
      patternInk: 'rgba(20,35,43,0.10)', pattern: 'checker'
    },
    forest: {
      name: 'Forest Classic',
      bg: 'linear-gradient(150deg, #0b3d2e 0%, #14532d 55%, #2a7f62 100%)',
      bgSolid: '#124a2a',
      ink: '#fff8e7', sub: 'rgba(255,248,231,0.86)', accent: '#ffd166',
      badge: '#e63946', badgeInk: '#ffffff',
      band: '#ffd166', bandInk: '#14532d',
      patternInk: 'rgba(255,255,255,0.10)', pattern: 'cross'
    },
    plain: {
      name: 'Plain (classic title page)',
      bg: '#ffffff', bgSolid: '#ffffff',
      ink: '#0f2027', sub: '#48626e', accent: '#b98a1d',
      badge: '#e63946', badgeInk: '#ffffff',
      band: '#ffd166', bandInk: '#14232b',
      patternInk: 'rgba(0,0,0,0)', pattern: 'none'
    }
  };
  var THEME_ORDER = ['midnight', 'crimson', 'royal', 'sunshine', 'forest', 'plain'];

  var DEFAULT_TYPES = 'Word Search • Crossword • Sudoku • Maze • Mystery';
  var BAND_TEXT = 'WITH SOLUTIONS INCLUDED';

  function defaultSettings() {
    return {
      title: 'The Big Book of Puzzles',
      subtitle: 'Hours of Brain-Teasing Fun for Puzzle Lovers',
      author: '',
      theme: 'midnight',
      typesLine: DEFAULT_TYPES,
      count: 100
    };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeSettings(raw) {
    var d = defaultSettings();
    if (!raw || typeof raw !== 'object') return d;
    var s = {
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : d.title,
      subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : d.subtitle,
      author: typeof raw.author === 'string' ? raw.author : d.author,
      theme: THEMES[raw.theme] ? raw.theme : d.theme,
      typesLine: typeof raw.typesLine === 'string' ? raw.typesLine : d.typesLine,
      count: parseInt(raw.count, 10)
    };
    if (isNaN(s.count) || s.count < 0) s.count = d.count;
    if (s.count > 100000) s.count = 100000;
    return s;
  }

  /* ---------- persistence ---------- */
  function store() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage) ? localStorage : null;
    } catch (e) { return null; }
  }
  function loadSettings() {
    var st = store();
    if (st) {
      try {
        var raw = st.getItem(SETTINGS_KEY);
        if (raw) return normalizeSettings(JSON.parse(raw));
      } catch (e) { /* corrupt JSON -> defaults */ }
    }
    return defaultSettings();
  }
  function saveSettings(settings) {
    var s = normalizeSettings(settings);
    var st = store();
    if (st) {
      try { st.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    }
    return s;
  }

  /* ---------- badge ---------- */
  // Bestseller badges round big counts down: "130+ PUZZLES!" for 137.
  function badgeNumber(count) {
    var n = Math.max(0, Math.floor(count || 0));
    if (n >= 100) return String(Math.floor(n / 10) * 10) + '+';
    return String(n);
  }

  /* ---------- decorative SVG patterns (deterministic) ---------- */
  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function patternSVG(theme) {
    var ink = theme.patternInk;
    var inner = '';
    var rnd, i, j;
    switch (theme.pattern) {
      case 'letters': {
        rnd = lcg(20261);
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (i = 0; i < 11; i++) {
          for (j = 0; j < 9; j++) {
            var ch = letters[Math.floor(rnd() * 26)];
            inner += '<text x="' + (22 + j * 44) + '" y="' + (42 + i * 46) +
              '" font-size="30" font-weight="700" text-anchor="middle">' + ch + '</text>';
          }
        }
        break;
      }
      case 'sudoku': {
        var cell = 400 / 9;
        for (i = 0; i <= 9; i++) {
          var p = (i * cell).toFixed(1);
          var wdt = i % 3 === 0 ? 3.4 : 1.2;
          inner += '<line x1="' + p + '" y1="30" x2="' + p + '" y2="430" stroke-width="' + wdt + '"/>' +
                   '<line x1="0" y1="' + (30 + i * cell).toFixed(1) + '" x2="400" y2="' +
                   (30 + i * cell).toFixed(1) + '" stroke-width="' + wdt + '"/>';
        }
        rnd = lcg(777);
        var used = {};
        for (i = 0; i < 16; i++) {
          var r = Math.floor(rnd() * 9), c = Math.floor(rnd() * 9);
          if (used[r + ',' + c]) continue;
          used[r + ',' + c] = true;
          inner += '<text x="' + (c * cell + cell / 2).toFixed(1) + '" y="' +
            (30 + r * cell + cell / 2 + 11).toFixed(1) +
            '" font-size="30" font-weight="700" text-anchor="middle">' + (1 + Math.floor(rnd() * 9)) + '</text>';
        }
        break;
      }
      case 'maze': {
        var paths = [
          'M10,30 H250 V140 H90 V250 H330 V360 H170 V470',
          'M390,80 H140 V200 H300 V310 H60 V420 H230',
          'M40,500 H180 V390 H330 V480 H390',
          'M360,20 V110 H200 V30'
        ];
        paths.forEach(function (d) {
          inner += '<path d="' + d + '" fill="none" stroke-width="13"/>';
        });
        inner += '<circle cx="10" cy="30" r="11"/><circle cx="230" cy="470" r="11"/>';
        break;
      }
      case 'checker': {
        var cs = 50;
        for (i = 0; i < 8; i++) {
          for (j = 0; j < 11; j++) {
            if ((i + j) % 2 === 0) {
              inner += '<rect x="' + (i * cs) + '" y="' + (j * cs) + '" width="' + cs + '" height="' + cs + '"/>';
            }
          }
        }
        break;
      }
      case 'cross': {
        var bs = 40;
        for (i = 0; i < 13; i++) {
          for (j = 0; j < 10; j++) {
            var filled = ((i * 7 + j * 3) % 5 === 0) || ((i + j) % 9 === 0);
            if (filled) {
              inner += '<rect x="' + (j * bs) + '" y="' + (i * bs) + '" width="' + (bs - 2) +
                '" height="' + (bs - 2) + '"/>';
            }
          }
        }
        break;
      }
      default:
        return '';
    }
    // letters/sudoku text + maze strokes use fill/stroke of patternInk;
    // rects (checker/cross) use fill too. Set both on the group.
    return '<svg class="cover-art" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" ' +
      'aria-hidden="true"><g fill="' + ink + '" stroke="' + ink + '">' + inner + '</g></svg>';
  }

  /* ---------- HTML cover (book page 1 + live preview) ---------- */
  // ctx: { count } overrides settings.count (book flow passes the real total).
  function coverHTML(settings, ctx) {
    var s = normalizeSettings(settings);
    var theme = THEMES[s.theme];
    var count = ctx && ctx.count != null ? ctx.count : s.count;
    var titleCls = 'cover-title-big' +
      (s.title.length > 46 ? ' cv-t3' : (s.title.length > 26 ? ' cv-t2' : ''));
    var h = '<div class="cover-frame" style="background:' + theme.bg + ';color:' + theme.ink + '">';
    h += patternSVG(theme);
    if (count > 0) {
      h += '<div class="cover-badge" style="background:' + theme.badge + ';color:' + theme.badgeInk + '">' +
        '<span class="cover-badge-num">' + esc(badgeNumber(count)) + '</span>' +
        '<span class="cover-badge-label">PUZZLES!</span></div>';
    }
    h += '<div class="cover-content">';
    h += '<h1 class="' + titleCls + '">' + esc(s.title.toUpperCase()) + '</h1>';
    if (s.subtitle.trim()) {
      h += '<p class="cover-subtitle" style="color:' + theme.sub + '">' + esc(s.subtitle) + '</p>';
    }
    h += '<div class="cover-flourish" style="color:' + theme.accent + '">✦ ✦ ✦</div>';
    if (s.typesLine.trim()) {
      h += '<p class="cover-types" style="color:' + theme.accent + '">' +
        esc(s.typesLine.toUpperCase()) + '</p>';
    }
    if (s.author.trim()) {
      h += '<p class="cover-author-line">by <strong>' + esc(s.author) + '</strong></p>';
    }
    h += '</div>';
    h += '<div class="cover-band" style="background:' + theme.band + ';color:' + theme.bandInk + '">' +
      BAND_TEXT + '</div>';
    h += '</div>';
    return h;
  }

  /* ---------- PNG draw plan (~300 DPI, pure — unit-testable) ---------- */
  var FONT = 'Arial, Helvetica, sans-serif';

  function textW(str, size) { return String(str).length * size * 0.60; }

  function wrapTitle(text, maxW, size) {
    var words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
    var lines = [], cur = '';
    words.forEach(function (w) {
      var trial = cur ? cur + ' ' + w : w;
      if (cur && textW(trial, size) > maxW) { lines.push(cur); cur = w; }
      else cur = trial;
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function fitTitle(text, maxW, startSize) {
    var size = startSize;
    while (size > 90) {
      var lines = wrapTitle(text, maxW, size);
      var ok = lines.every(function (l) { return textW(l, size) <= maxW; });
      if (ok && lines.length <= 4) return { size: size, lines: lines };
      size -= 12;
    }
    return { size: size, lines: wrapTitle(text, maxW, size) };
  }

  function planCover(settings, trimKey) {
    var s = normalizeSettings(settings);
    var theme = THEMES[s.theme];
    var trim = TRIMS[trimKey] || TRIMS['8.5x11'];
    var W = Math.round(trim.w * 300), H = Math.round(trim.h * 300);
    var plan = { type: 'cover', title: s.title, width: W, height: H, ops: [] };
    var cx = W / 2;

    plan.ops.push({ t: 'rect', x: 0, y: 0, w: W, h: H, color: theme.bgSolid });

    // pattern (simplified per theme, kept inside the frame)
    var ix = 90, iy = 90, iw = W - 180, ih = H - 180;
    var i, j;
    if (theme.pattern === 'letters') {
      var rnd = lcg(20261);
      var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var cols = Math.floor(iw / 132), rows = Math.floor(ih / 138);
      for (i = 0; i < rows; i++) {
        for (j = 0; j < cols; j++) {
          plan.ops.push({
            t: 'text', x: ix + j * 132 + 66, y: iy + i * 138 + 69,
            str: letters[Math.floor(rnd() * 26)], size: 92, font: FONT,
            weight: 700, color: theme.accent, align: 'center', alpha: 0.13
          });
        }
      }
    } else if (theme.pattern === 'sudoku') {
      var gx = ix + 40, gy = iy + 40, gw = Math.min(iw - 80, ih - 80);
      var cell = gw / 9;
      for (i = 0; i <= 9; i++) {
        var lw = i % 3 === 0 ? 9 : 3;
        plan.ops.push({ t: 'line', x1: gx + i * cell, y1: gy, x2: gx + i * cell, y2: gy + gw, lw: lw, color: theme.ink, alpha: 0.12 });
        plan.ops.push({ t: 'line', x1: gx, y1: gy + i * cell, x2: gx + gw, y2: gy + i * cell, lw: lw, color: theme.ink, alpha: 0.12 });
      }
    } else if (theme.pattern === 'maze') {
      var mp = [[0.03, 0.06], [0.62, 0.06], [0.62, 0.27], [0.22, 0.27], [0.22, 0.48], [0.82, 0.48], [0.82, 0.69], [0.42, 0.69], [0.42, 0.90]];
      plan.ops.push({
        t: 'path',
        pts: mp.map(function (p) { return [ix + p[0] * iw, iy + p[1] * ih]; }),
        lw: 34, color: theme.ink, alpha: 0.12
      });
    } else if (theme.pattern === 'checker') {
      var cs2 = 150;
      for (i = 0; i * cs2 < iw; i++) {
        for (j = 0; j * cs2 < ih; j++) {
          if ((i + j) % 2 === 0) {
            plan.ops.push({ t: 'rect', x: ix + i * cs2, y: iy + j * cs2, w: cs2, h: cs2, color: theme.ink, alpha: 0.10 });
          }
        }
      }
    } else if (theme.pattern === 'cross') {
      var bs2 = 120;
      for (i = 0; i * bs2 < ih; i++) {
        for (j = 0; j * bs2 < iw; j++) {
          var on = ((i * 7 + j * 3) % 5 === 0) || ((i + j) % 9 === 0);
          if (on) plan.ops.push({ t: 'rect', x: ix + j * bs2, y: iy + i * bs2, w: bs2 - 6, h: bs2 - 6, color: theme.ink, alpha: 0.13 });
        }
      }
    }

    // inner frame
    plan.ops.push({ t: 'frame', x: 54, y: 54, w: W - 108, h: H - 108, lw: 10, color: theme.accent });

    // badge (top-right)
    if (s.count > 0) {
      var br = Math.round(W * 0.115);
      var bx = W - br - Math.round(W * 0.075), by = br + Math.round(H * 0.055);
      plan.ops.push({ t: 'circle', x: bx, y: by, r: br, color: theme.badge });
      plan.ops.push({
        t: 'text', x: bx, y: by - br * 0.18, str: badgeNumber(s.count),
        size: Math.round(br * 0.78), font: FONT, weight: 800, color: theme.badgeInk, align: 'center'
      });
      plan.ops.push({
        t: 'text', x: bx, y: by + br * 0.42, str: 'PUZZLES!',
        size: Math.round(br * 0.40), font: FONT, weight: 800, color: theme.badgeInk, align: 'center'
      });
    }

    // title block
    var maxTitleW = W - Math.round(W * 0.16) * 2;
    var startSize = Math.round(W * 0.105);
    var fit = fitTitle(s.title, maxTitleW, startSize);
    var y = Math.round(H * 0.30);
    fit.lines.forEach(function (line) {
      plan.ops.push({
        t: 'text', x: cx, y: y, str: line, size: fit.size, font: FONT,
        weight: 800, color: theme.ink, align: 'center'
      });
      y += Math.round(fit.size * 1.10);
    });

    if (s.subtitle.trim()) {
      y += Math.round(H * 0.018);
      plan.ops.push({
        t: 'text', x: cx, y: y, str: s.subtitle, size: Math.round(W * 0.030),
        font: FONT, weight: 600, color: theme.ink, align: 'center'
      });
      y += Math.round(H * 0.045);
    }
    plan.ops.push({
      t: 'text', x: cx, y: y + Math.round(H * 0.02), str: '✦ ✦ ✦',
      size: Math.round(W * 0.034), font: FONT, weight: 700, color: theme.accent, align: 'center'
    });
    if (s.typesLine.trim()) {
      plan.ops.push({
        t: 'text', x: cx, y: y + Math.round(H * 0.075), str: s.typesLine.toUpperCase(),
        size: Math.round(W * 0.027), font: FONT, weight: 700, color: theme.accent, align: 'center'
      });
    }
    if (s.author.trim()) {
      plan.ops.push({
        t: 'text', x: cx, y: H - Math.round(H * 0.135), str: 'by ' + s.author,
        size: Math.round(W * 0.036), font: FONT, weight: 700, color: theme.ink, align: 'center'
      });
    }

    // bottom band
    var bandH = Math.round(H * 0.062);
    plan.ops.push({ t: 'rect', x: 0, y: H - bandH, w: W, h: bandH, color: theme.band });
    plan.ops.push({
      t: 'text', x: cx, y: H - bandH / 2, str: BAND_TEXT,
      size: Math.round(bandH * 0.44), font: FONT, weight: 800, color: theme.bandInk, align: 'center'
    });

    plan.gridLongest = Math.max(W, H);
    return plan;
  }

  function downloadCoverPNG(settings, trimKey) {
    if (typeof PNGExport === 'undefined' || typeof document === 'undefined') return null;
    var plan = planCover(settings, trimKey);
    var canvas = document.createElement('canvas');
    PNGExport.renderPlan(canvas, plan);
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'book-cover.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }, 'image/png');
    } else {
      var a2 = document.createElement('a');
      a2.href = canvas.toDataURL('image/png');
      a2.download = 'book-cover.png';
      document.body.appendChild(a2);
      a2.click();
      a2.remove();
    }
    return plan;
  }

  var api = {
    SETTINGS_KEY: SETTINGS_KEY,
    TRIMS: TRIMS,
    THEMES: THEMES,
    THEME_ORDER: THEME_ORDER,
    BAND_TEXT: BAND_TEXT,
    defaultSettings: defaultSettings,
    normalizeSettings: normalizeSettings,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    badgeNumber: badgeNumber,
    patternSVG: patternSVG,
    coverHTML: coverHTML,
    planCover: planCover,
    fitTitle: fitTitle,
    downloadCoverPNG: downloadCoverPNG
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CoverMaker = api;
})(typeof window !== 'undefined' ? window : globalThis);
