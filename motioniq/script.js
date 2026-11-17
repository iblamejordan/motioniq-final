/* =========================================================
   MOTIONIQ – interactions
   No external libraries, no network calls, no API keys.
   Sections: helpers · theme · nav · reveal · hero · workflow ·
             charts · lab · ML tabs · tech · preview · results
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var css = function (n) { return getComputedStyle(root).getPropertyValue(n).trim(); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  var R = window.MOTIONIQ_RESULTS || { verified: false };
  var TECH = window.MOTIONIQ_TECH || {};

  var ACT = [
    { key: 'walking',    name: 'Walking',            icon: 'i-walk',  color: '#5b86ff' },
    { key: 'upstairs',   name: 'Walking Upstairs',   icon: 'i-up',    color: '#9a7bff' },
    { key: 'downstairs', name: 'Walking Downstairs', icon: 'i-down',  color: '#2dd4ee' },
    { key: 'sitting',    name: 'Sitting',            icon: 'i-sit',   color: '#f5b84b' },
    { key: 'standing',   name: 'Standing',           icon: 'i-stand', color: '#34d399' },
    { key: 'laying',     name: 'Laying',             icon: 'i-lay',   color: '#fb7185' }
  ];
  var AX = ['#5b86ff', '#9a7bff', '#2dd4ee'];

  /* ---------------- theme ---------------- */
  var redrawers = [];
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#f5f7fc' : '#05070f');
    redrawers.forEach(function (f) { f(); });
  }
  $('#themeBtn').addEventListener('click', function () {
    var next = (root.getAttribute('data-theme') === 'light') ? 'dark' : 'light';
    store.set('motioniq-theme', next);
    applyTheme(next);
  });

  /* ---------------- navigation ---------------- */
  var nav = $('#nav'), menuBtn = $('#menuBtn'), header = $('.site-header'), bar = $('#progress');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var navLinks = $$('a[href^="#"]', nav);
  var navTargets = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      header.classList.toggle('scrolled', y > 12);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      var cur = -1;
      navTargets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= 140) cur = i; });
      navLinks.forEach(function (a, i) {
        if (i === cur) a.classList.add('active'); else a.classList.remove('active');
        if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- scroll reveal ---------------- */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(function (el) { rio.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- hero: sensor-wave visualisation ---------------- */
  (function hero() {
    var cv = $('#heroCanvas'), ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, t = 0, running = true, mouse = { x: -999, y: -999 };
    // Each "mode" loosely mimics a kind of movement: amplitude, frequency, speed.
    var modes = [
      { a: 0.17, f: 0.016, s: 2.2 }, // lively
      { a: 0.04, f: 0.006, s: 0.5 }, // near-still
      { a: 0.22, f: 0.021, s: 2.8 }, // energetic
      { a: 0.09, f: 0.011, s: 1.3 }  // moderate
    ];
    var cur = { a: modes[0].a, f: modes[0].f, s: modes[0].s }, mi = 0, lastSwitch = 0;
    var phases = [0, 1.7, 3.3];
    var parts = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = clamp(Math.round(w / 12), 40, 110);
      parts = [];
      for (var i = 0; i < n; i++) parts.push({ x: Math.random() * w, wave: i % 3, off: (Math.random() - 0.5) * 70, sp: 0.2 + Math.random() * 0.8, r: 0.8 + Math.random() * 1.6 });
    }
    function waveY(i, x) {
      var env = 0.3 + 0.7 * (x / w);                // stronger on the right, calm behind the text
      var base = h * (0.5 + (i - 1) * 0.1);
      return base + Math.sin(x * cur.f + t * cur.s + phases[i]) * cur.a * h * env
                  + Math.sin(x * cur.f * 2.3 + t * cur.s * 1.4 + phases[i] * 2) * cur.a * h * 0.28 * env;
    }
    function frame(ts) {
      if (!running) return;
      t = ts / 1000;
      if (t - lastSwitch > 5) { lastSwitch = t; mi = (mi + 1) % modes.length; }
      var m = modes[mi];
      cur.a = lerp(cur.a, m.a, 0.02); cur.f = lerp(cur.f, m.f, 0.02); cur.s = lerp(cur.s, m.s, 0.02);
      ctx.clearRect(0, 0, w, h);
      var light = root.getAttribute('data-theme') === 'light';
      var wave;
      for (wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        for (var x = 0; x <= w; x += 5) {
          var y = waveY(wave, x);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = AX[wave]; ctx.globalAlpha = light ? 0.55 : 0.7; ctx.lineWidth = 1.8; ctx.stroke();
      }
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.sp * (0.6 + cur.s * 0.5); if (p.x > w + 10) p.x = -10;
        var py = waveY(p.wave, p.x) + p.off * Math.sin(t * 0.8 + i) * 0.5 * (0.3 + cur.a * 3);
        var dx = p.x - mouse.x, dy = py - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 9000) { var k = 1 - d2 / 9000; py += (dy / (Math.sqrt(d2) + 1)) * 26 * k; p.x += (dx / (Math.sqrt(d2) + 1)) * 3 * k; }
        ctx.beginPath(); ctx.arc(p.x, py, p.r, 0, 6.2832);
        ctx.fillStyle = AX[p.wave]; ctx.globalAlpha = light ? 0.7 : 0.85; ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
    resize();
    window.addEventListener('resize', resize);
    $('#hero').addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    $('#hero').addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    if (reduceMotion) { running = true; t = 3; frame(3000); running = false; return; } // single still frame
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else running = false; }).observe(cv);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else start(); });
    requestAnimationFrame(frame);
  })();

  /* ---------------- workflow ---------------- */
  (function workflow() {
    var S = [
      { t: 'Smartphone Sensors', b: 'info', st: 'Source of the data',
        d: 'The phone contains an accelerometer, which measures acceleration along three axes (including gravity), and a gyroscope, which measures how fast the phone rotates. Together they describe how the phone, and so the person carrying it, is moving.',
        i: 'Physical movement of the phone', o: 'Continuous sensor readings' },
      { t: 'Data Collection', b: 'info', st: 'Provided by the dataset',
        d: 'Readings are sampled many times per second and stored with a time stamp. In the UCI HAR dataset, recordings were gathered while people performed known activities, so every recording carries an activity label.',
        i: 'Sensor readings', o: 'Labelled time-series recordings' },
      { t: 'Data Preprocessing', b: 'info', st: 'Provided by the dataset',
        d: 'Raw signals contain noise and are too long to classify at once. They are cleaned and cut into short, fixed-length windows so that each window can receive one label. The dataset supplies this already prepared; the project checks and loads it.',
        i: 'Labelled recordings', o: 'Clean signal windows' },
      { t: 'Feature Extraction', b: 'info', st: 'Provided by the dataset',
        d: 'A window of raw numbers is hard for a model to compare. It is summarised into features, such as averages, spread and frequency-related measures. The dataset ships these per-window features, which become the model input.',
        i: 'Signal windows', o: 'One feature vector per window' },
      { t: 'Machine Learning Model', b: 'ok', st: 'Preliminary experiment',
        d: 'A Random Forest classifier is trained on the training features and their labels. It learns which feature patterns go with which activity. Decision Tree and SVM are intended as comparison models. A trained model can be saved with Joblib (planned).',
        i: 'Training features + labels', o: 'Trained classifier' },
      { t: 'Activity Classification', b: 'ok', st: 'Preliminary experiment',
        d: 'For a new window the model receives the feature vector and outputs one of six activities. Because the held-out test set has known labels, comparing predictions with the truth gives the performance metrics.',
        i: 'Features of an unseen window', o: 'Predicted activity label' },
      { t: 'Interactive Dashboard', b: 'warn', st: 'Planned',
        d: 'A web interface (planned with Streamlit and Plotly) will show the prediction and charts. The Application Preview section on this page shows what it is intended to look like, using sample data only.',
        i: 'Predicted labels', o: 'Prediction panel and charts' },
      { t: 'Activity Analytics', b: 'warn', st: 'Planned',
        d: 'Once every window has a label, simple analytics become possible: time per activity, a daily summary, an activity history and a flag for long inactive periods. How long counts as “prolonged” has not been decided yet.',
        i: 'Sequence of labels over time', o: 'Statistics and inactivity alerts' }
    ];
    var list = $('#flow'), box = $('#flowDetail'), btns = [], cur = 0;

    S.forEach(function (s, i) {
      var li = document.createElement('li'); li.setAttribute('role', 'presentation');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'node'; b.id = 'node' + i; b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'flowDetail');
      b.innerHTML = '<span class="n">' + (i + 1) + '</span><span>' + s.t + '</span>';
      b.addEventListener('click', function () { select(i, true); });
      b.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % S.length;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + S.length) % S.length;
        if (n !== null) { e.preventDefault(); select(n, true); btns[n].focus(); }
      });
      li.appendChild(b); list.appendChild(li); btns.push(b);
    });

    function select(i) {
      cur = i;
      btns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      var s = S[i];
      box.setAttribute('role', 'tabpanel'); box.setAttribute('aria-labelledby', 'node' + i);
      box.innerHTML = '<div class="anim"><div class="step">STAGE ' + (i + 1) + ' / ' + S.length + '</div>' +
        '<h3>' + s.t + '</h3><span class="badge ' + s.b + '" style="margin-bottom:1rem">' + s.st + '</span><p>' + s.d + '</p>' +
        '<div class="io"><div><b>Input</b>' + s.i + '</div><div><b>Output</b>' + s.o + '</div></div>' +
        '<div class="hint">Use ↑ ↓ keys or tap another stage</div></div>';
    }
    select(0);
  })();

  /* ---------------- synthetic signals (illustrative only) ---------------- */
  var SIG = {
    walking:    { g: [0.95, 0.10, 0.15], a: [0.45, 0.25, 0.30], f: 2.0, ph: [0, 1.2, 2.1], n: 0.04, h: 0 },
    upstairs:   { g: [0.90, 0.15, 0.25], a: [0.50, 0.30, 0.40], f: 1.6, ph: [0, 0.8, 1.9], n: 0.05, h: 0.35 },
    downstairs: { g: [0.95, 0.10, 0.10], a: [0.75, 0.40, 0.55], f: 2.5, ph: [0, 1.4, 2.5], n: 0.06, h: 0.5 },
    sitting:    { g: [0.80, 0.10, 0.55], a: [0.03, 0.03, 0.03], f: 0.4, ph: [0, 1, 2], n: 0.015, h: 0 },
    standing:   { g: [0.98, 0.05, 0.12], a: [0.025, 0.03, 0.03], f: 0.4, ph: [0, 1, 2], n: 0.015, h: 0 },
    laying:     { g: [0.05, 0.92, 0.40], a: [0.02, 0.02, 0.02], f: 0.3, ph: [0, 1, 2], n: 0.012, h: 0 }
  };
  var NPTS = 200, TSPAN = 5;
  function noise(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
  function signal(key) {
    var p = SIG[key], out = [[], [], []];
    for (var k = 0; k < 3; k++) {
      for (var i = 0; i < NPTS; i++) {
        var t = (i / (NPTS - 1)) * TSPAN, a = 6.2832 * p.f * t + p.ph[k];
        out[k].push(p.g[k] + p.a[k] * (Math.sin(a) + p.h * Math.sin(2 * a + p.ph[k])) + p.n * noise(i, k + 1));
      }
    }
    return out;
  }

  /* ---------------- generic canvas chart ---------------- */
  function Chart(box, draw, hit) {
    var self = this;
    this.box = box; this.cv = $('canvas', box); this.ctx = this.cv.getContext('2d'); this.tip = $('.tip', box);
    this.draw = draw; this.hit = hit; this.state = {}; this.hover = null;
    this.cv.style.touchAction = 'pan-y';
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      self.w = box.clientWidth; self.h = box.clientHeight;
      self.cv.width = self.w * dpr; self.cv.height = self.h * dpr;
      self.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      self.render();
    }
    function move(e) {
      var r = self.cv.getBoundingClientRect();
      var res = self.hit(e.clientX - r.left, e.clientY - r.top, self);
      self.hover = res ? res.id : null;
      if (res) {
        self.tip.innerHTML = res.html; self.tip.classList.add('on');
        var tw = self.tip.offsetWidth / 2;
        self.tip.style.left = clamp(res.x, tw + 2, self.w - tw - 2) + 'px';
        self.tip.style.top = Math.max(res.y, 34) + 'px';
      } else self.tip.classList.remove('on');
      self.render();
    }
    function leave() { self.hover = null; self.tip.classList.remove('on'); self.render(); }
    this.cv.addEventListener('pointermove', move);
    this.cv.addEventListener('pointerdown', move);
    this.cv.addEventListener('pointerleave', leave);
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(box); else window.addEventListener('resize', size);
    redrawers.push(function () { self.render(); });
    size();
  }
  Chart.prototype.render = function () {
    if (!this.w) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.draw(this.ctx, this.w, this.h, this);
  };

  /* Line chart for three-axis signals */
  function lineChart(box, getSeries) {
    var P = { l: 38, r: 12, t: 12, b: 26 }, YMIN = -1.2, YMAX = 2.0;
    function X(i, w) { return P.l + (i / (NPTS - 1)) * (w - P.l - P.r); }
    function Y(v, h) { return P.t + (1 - (v - YMIN) / (YMAX - YMIN)) * (h - P.t - P.b); }
    return new Chart(box,
      function (c, w, h, ch) {
        var s = getSeries(), line = css('--line'), muted = css('--muted');
        c.font = '11px ui-monospace, Menlo, Consolas, monospace'; c.textAlign = 'right'; c.textBaseline = 'middle';
        for (var v = -1; v <= 2; v += 1) {
          var y = Y(v, h); c.strokeStyle = line; c.lineWidth = 1; c.beginPath(); c.moveTo(P.l, y); c.lineTo(w - P.r, y); c.stroke();
          c.fillStyle = muted; c.fillText(v.toFixed(0), P.l - 7, y);
        }
        c.textAlign = 'center'; c.textBaseline = 'top';
        for (var tt = 0; tt <= TSPAN; tt++) { c.fillStyle = muted; c.fillText(tt + 's', X((tt / TSPAN) * (NPTS - 1), w), h - P.b + 8); }
        for (var k = 0; k < 3; k++) {
          c.beginPath();
          for (var i = 0; i < NPTS; i++) { var px = X(i, w), py = Y(s[k][i], h); if (i) c.lineTo(px, py); else c.moveTo(px, py); }
          c.strokeStyle = AX[k]; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
        }
        if (ch.hover !== null) {
          var hx = X(ch.hover, w);
          c.strokeStyle = muted; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(hx, P.t); c.lineTo(hx, h - P.b); c.stroke(); c.setLineDash([]);
          for (var q = 0; q < 3; q++) { c.beginPath(); c.arc(hx, Y(s[q][ch.hover], h), 4.5, 0, 6.2832); c.fillStyle = AX[q]; c.fill(); c.strokeStyle = css('--surface-solid'); c.lineWidth = 2; c.stroke(); }
        }
      },
      function (mx, my, ch) {
        if (mx < P.l || mx > ch.w - P.r) return null;
        var i = clamp(Math.round(((mx - P.l) / (ch.w - P.l - P.r)) * (NPTS - 1)), 0, NPTS - 1), s = getSeries();
        return { id: i, x: X(i, ch.w), y: Y(Math.max(s[0][i], s[1][i], s[2][i]), ch.h) - 4,
          html: 't = ' + ((i / (NPTS - 1)) * TSPAN).toFixed(2) + ' s<br><span style="color:' + AX[0] + '">x ' + s[0][i].toFixed(2) + '</span> · <span style="color:' + AX[1] + '">y ' + s[1][i].toFixed(2) + '</span> · <span style="color:' + AX[2] + '">z ' + s[2][i].toFixed(2) + '</span>' };
      });
  }

  /* Tweened series holder so a chart morphs when the activity changes */
  function Morph(key, chart) {
    var self = this; this.cur = signal(key); this.chartRef = chart;
    this.set = function (k) {
      var from = self.cur.map(function (a) { return a.slice(); }), to = signal(k), t0 = null;
      if (reduceMotion) { self.cur = to; if (self.chartRef.c) self.chartRef.c.render(); return; }
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / 450, 0, 1), e = 1 - Math.pow(1 - p, 3);
        self.cur = from.map(function (a, k2) { return a.map(function (v, i) { return lerp(v, to[k2][i], e); }); });
        if (self.chartRef.c) self.chartRef.c.render();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
  }

  /* ---------------- dataset sensor lab ---------------- */
  (function lab() {
    var seg = $('#labSeg'), ref = {}, m = new Morph('walking', ref), btns = [];
    ACT.forEach(function (a, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = a.name; b.setAttribute('aria-pressed', String(i === 0));
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); m.set(a.key);
      });
      seg.appendChild(b); btns.push(b);
    });
    ref.c = lineChart($('#labChart'), function () { return m.cur; });
  })();

  /* ---------------- ML algorithm tabs ---------------- */
  (function mlTabs() {
    var M = [
      { n: 'Random Forest', b: 'ok', s: 'Used in preliminary experiment',
        how: 'Builds many decision trees. Each tree is trained on a random sample of the data and a random subset of features. For a new window every tree votes, and the most common activity wins.',
        pros: ['Copes well with many numeric features', 'Combining trees reduces over-fitting compared with one tree', 'Can report which features mattered most'],
        cons: ['Larger and slower than a single tree', 'Harder to explain than one tree'] },
      { n: 'Decision Tree', b: 'warn', s: 'Planned comparison',
        how: 'A single tree of yes/no questions about feature values, such as “is this value above a threshold?”. Following the answers from the top leads to one activity label.',
        pros: ['Easy to read and explain', 'Fast to train and to predict'],
        cons: ['Can over-fit the training data', 'Small data changes can change the whole tree'] },
      { n: 'Support Vector Machine', b: 'warn', s: 'Planned comparison',
        how: 'Looks for the boundary that separates activity classes with the widest possible margin. Kernels allow curved boundaries when classes do not separate with a straight line.',
        pros: ['Often effective with many features', 'Margin idea gives a clear way to separate classes'],
        cons: ['Features normally need scaling first', 'Settings such as kernel and C need tuning', 'Training can be slow on large data'] }
    ];
    var seg = $('#mlSeg'), panel = $('#mlPanel'), btns = [];
    function show(i) {
      btns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); });
      var m = M[i];
      panel.innerHTML =
        '<div class="panel"><h3 style="color:var(--cyan)">' + m.n + '</h3><span class="badge ' + m.b + '" style="margin-bottom:1rem">' + m.s + '</span><p>' + m.how + '</p></div>' +
        '<div class="panel"><h3 style="color:var(--ok)">Strengths</h3><ul>' + m.pros.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '<h3 style="color:var(--amber);margin-top:1.2rem">Watch-outs</h3><ul>' + m.cons.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
    }
    M.forEach(function (m, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = m.n; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { show(i); }); seg.appendChild(b); btns.push(b);
    });
    show(0);
  })();

  /* ---------------- technology cards ---------------- */
  (function tech() {
    var T = [
      ['Python', 'Py', 'Core programming language of the project.'],
      ['NumPy', 'Np', 'Fast numerical arrays for sensor values.'],
      ['Pandas', 'Pd', 'Loading and handling the dataset as tables.'],
      ['Scikit-learn', 'Sk', 'Machine-learning models and evaluation metrics.'],
      ['Matplotlib', 'Mp', 'Static plots for analysis.'],
      ['Plotly', 'Pl', 'Interactive charts for the dashboard.'],
      ['Streamlit', 'St', 'Turning Python code into a web dashboard.'],
      ['Joblib', 'Jl', 'Saving and loading the trained model.'],
      ['Visual Studio Code', 'VS', 'Code editor used for development.'],
      ['GitHub', 'Gh', 'Version control and project hosting.']
    ];
    $('#techGrid').innerHTML = T.map(function (t, i) {
      var used = TECH[t[0]] === 'used';
      return '<article class="tcard reveal in" style="--d:' + (i * 0.03) + 's"><div class="mono" aria-hidden="true">' + t[1] + '</div><h3>' + t[0] + '</h3><p>' + t[2] + '</p>' +
        '<span class="badge ' + (used ? 'ok' : 'warn') + '">' + (used ? 'In use' : 'Planned') + '</span></article>';
    }).join('');
  })();

  /* ---------------- application preview (sample data only) ---------------- */
  (function preview() {
    var byKey = {}; ACT.forEach(function (a) { byKey[a.key] = a; });
    // Hard-coded sample probabilities, order = ACT order. Each row sums to 1.
    var FR = [
      { k: 'walking',  p: [0.72, 0.12, 0.10, 0.01, 0.04, 0.01] },
      { k: 'sitting',  p: [0.01, 0.01, 0.01, 0.68, 0.28, 0.01] },
      { k: 'upstairs', p: [0.18, 0.64, 0.15, 0.01, 0.02, 0.00] },
      { k: 'laying',   p: [0.00, 0.00, 0.00, 0.05, 0.03, 0.92] }
    ];
    // Sample day: [activity, minutes]; totals 423 min.
    var DAY = [['laying', 90], ['standing', 20], ['walking', 25], ['sitting', 95], ['standing', 20], ['upstairs', 10], ['downstairs', 8], ['standing', 20], ['walking', 20], ['sitting', 115]];
    var totals = {}; DAY.forEach(function (d) { totals[d[0]] = (totals[d[0]] || 0) + d[1]; });
    var total = DAY.reduce(function (s, d) { return s + d[1]; }, 0);
    var hm = function (m) { return Math.floor(m / 60) + ' h ' + ('0' + (m % 60)).slice(-2) + ' m'; };

    // probability bars
    var pb = $('#pbars');
    pb.innerHTML = ACT.map(function (a, i) { return '<div class="pb"><span>' + a.name.replace('Walking ', 'Walk ') + '</span><div><i id="pbi' + i + '" style="width:0"></i></div><span id="pbv' + i + '">0.00</span></div>'; }).join('');
    var fi = 0;
    function showFrame() {
      var f = FR[fi], a = byKey[f.k];
      $('#frameNo').textContent = fi + 1;
      $('#predName').textContent = a.name;
      $('#predConf').textContent = 'sample confidence ' + Math.max.apply(null, f.p).toFixed(2);
      var ic = $('#predIc'); ic.style.setProperty('--c', a.color); ic.innerHTML = '<svg viewBox="0 0 48 48"><use href="#' + a.icon + '"/></svg>';
      f.p.forEach(function (v, i) { $('#pbi' + i).style.width = (v * 100) + '%'; $('#pbv' + i).textContent = v.toFixed(2); });
      morph.set(f.k);
    }
    var ref = {}, morph = new Morph('walking', ref);
    ref.c = lineChart($('#pvChart'), function () { return morph.cur; });
    $('#frameBtn').addEventListener('click', function () { fi = (fi + 1) % FR.length; showFrame(); });

    // donut
    var dl = $('#donutList'), order = ACT.filter(function (a) { return totals[a.key]; });
    dl.innerHTML = order.map(function (a) { return '<li><i style="background:' + a.color + '"></i>' + a.name + '<span>' + totals[a.key] + ' min</span></li>'; }).join('');
    new Chart($('#donut'),
      function (c, w, h, ch) {
        var cx = w / 2, cy = h / 2, R0 = Math.min(w, h) / 2 - 8, r0 = R0 * 0.62, ang = -Math.PI / 2;
        order.forEach(function (a, i) {
          var span = (totals[a.key] / total) * 6.2832, hot = ch.hover === i, ro = R0 + (hot ? 5 : 0);
          c.beginPath(); c.arc(cx, cy, ro, ang, ang + span - 0.03); c.arc(cx, cy, r0, ang + span - 0.03, ang, true); c.closePath();
          c.fillStyle = a.color; c.globalAlpha = ch.hover === null || hot ? 1 : 0.45; c.fill(); c.globalAlpha = 1; ang += span;
        });
        c.fillStyle = css('--muted'); c.font = '600 11px ui-monospace, Menlo, Consolas, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('SAMPLE', cx, cy - 7); c.fillText(total + ' min', cx, cy + 9);
      },
      function (mx, my, ch) {
        var cx = ch.w / 2, cy = ch.h / 2, dx = mx - cx, dy = my - cy, d = Math.sqrt(dx * dx + dy * dy), R0 = Math.min(ch.w, ch.h) / 2 - 8;
        if (d < R0 * 0.62 || d > R0 + 8) return null;
        var ang = Math.atan2(dy, dx) + Math.PI / 2; if (ang < 0) ang += 6.2832;
        var acc = 0;
        for (var i = 0; i < order.length; i++) {
          var span = (totals[order[i].key] / total) * 6.2832;
          if (ang < acc + span) return { id: i, x: mx, y: my - 6, html: '<b>' + order[i].name + '</b><br>' + totals[order[i].key] + ' min · ' + ((totals[order[i].key] / total) * 100).toFixed(1) + '% (sample)' };
          acc += span;
        }
        return null;
      });

    // summary
    var walkMin = (totals.walking || 0) + (totals.upstairs || 0) + (totals.downstairs || 0);
    var longestSit = Math.max.apply(null, DAY.filter(function (d) { return d[0] === 'sitting'; }).map(function (d) { return d[1]; }));
    $('#sum').innerHTML = [[hm(total), 'Tracked time'], [hm(walkMin), 'Walking-type time'], [hm(longestSit), 'Longest sitting run'], ['1', 'Inactivity alert']].map(function (x) { return '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>'; }).join('');

    // history (latest first) and timeline
    var start = 7 * 60, rows = [], clock = start;
    DAY.forEach(function (d) { rows.push({ k: d[0], m: d[1], at: clock }); clock += d[1]; });
    var fmt = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
    $('#hist').innerHTML = rows.slice().reverse().map(function (r) {
      return '<li><time>' + fmt(r.at) + '</time><span><i style="background:' + byKey[r.k].color + '"></i>' + byKey[r.k].name + '</span><em>' + r.m + ' min</em></li>';
    }).join('');
    $('#timeline').innerHTML = rows.map(function (r) {
      return '<i title="' + byKey[r.k].name + ' · ' + r.m + ' min (sample)" style="width:' + (r.m / total * 100) + '%;background:' + byKey[r.k].color + '"></i>';
    }).join('');
    $('#tlLegend').innerHTML = order.map(function (a) { return '<span><i style="background:' + a.color + ';height:8px;width:8px;border-radius:2px"></i>' + a.name + '</span>'; }).join('');
    showFrame();
  })();

  /* ---------------- results (placeholders unless verified) ---------------- */
  (function results() {
    var L = R.labels || [], short = ['Walk', 'Up', 'Down', 'Sit', 'Stand', 'Lay'];
    var okAcc = R.verified === true && typeof R.accuracy === 'number';
    var okCm = R.verified === true && Array.isArray(R.confusionMatrix) && R.confusionMatrix.length === L.length &&
      R.confusionMatrix.every(function (r) { return Array.isArray(r) && r.length === L.length && r.every(function (v) { return typeof v === 'number'; }); });
    var okRep = R.verified === true && Array.isArray(R.classReport) && R.classReport.length === L.length;

    // preliminary note
    var pr = R.preliminary || {};
    $('#prelim').innerHTML = (okAcc
      ? '<span class="badge ok">Verified</span><p>Accuracy verified against the saved experiment on the UCI HAR train/test split.</p>'
      : '<div class="big">≈' + (pr.accuracyPercent || 0).toFixed(2) + '%</div><div><span class="badge warn" style="margin-bottom:.6rem">Preliminary · unverified</span>' +
        '<p>An earlier preliminary ' + (pr.model || 'Random Forest') + ' experiment reported approximately this accuracy on the UCI HAR train/test split. It has <b>not</b> yet been checked against the saved experiment, so it is not presented as a final result.</p></div>');

    // accuracy card
    var badge = $('#accBadge'), val = $('#accVal');
    if (okAcc) {
      badge.className = 'badge ok'; badge.textContent = 'Verified'; val.classList.add('real');
      var target = R.accuracy, shown = false;
      var setV = function (v) { val.textContent = v.toFixed(2) + '%'; };
      setV(reduceMotion ? target : 0);
      if (!reduceMotion && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (es, o) {
          if (!es[0].isIntersecting || shown) return; shown = true; o.disconnect();
          var t0 = null;
          (function step(ts) { if (t0 === null) t0 = ts; var p = clamp((ts - t0) / 1400, 0, 1); setV(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
        }, { threshold: 0.5 }).observe(val);
      } else setV(target);
    } else { badge.className = 'badge warn'; badge.textContent = 'Pending'; val.textContent = '—'; }

    // confusion matrix
    var cm = $('#cm'), html = '<thead><tr><th></th><th colspan="' + L.length + '">Predicted →</th></tr><tr><th class="rl">True ↓</th>' +
      L.map(function (l, i) { return '<th title="' + l + '">' + short[i] + '</th>'; }).join('') + '</tr></thead><tbody>';
    L.forEach(function (l, r) {
      html += '<tr><th class="rl">' + l + '</th>';
      L.forEach(function (_, c) {
        if (okCm) {
          var rowMax = Math.max.apply(null, R.confusionMatrix[r]) || 1;
          html += '<td class="real" style="--a:' + (R.confusionMatrix[r][c] / rowMax * 0.85).toFixed(2) + '">' + R.confusionMatrix[r][c] + '</td>';
        } else html += '<td>—</td>';
      });
      html += '</tr>';
    });
    cm.innerHTML = html + '</tbody>';
    if (okCm) { $('#cmBadge').className = 'badge ok'; $('#cmBadge').textContent = 'Verified'; }

    // classification report
    var f = function (v) { return typeof v === 'number' ? v.toFixed(2) : '<span class="ph">[pending]</span>'; };
    var rep = '<thead><tr><th>Activity</th><th>Precision</th><th>Recall</th><th>F1-score</th><th>Support</th></tr></thead><tbody>';
    L.forEach(function (l, i) {
      var r = okRep ? R.classReport[i] : {};
      rep += '<tr><td>' + l + '</td><td>' + f(r.precision) + '</td><td>' + f(r.recall) + '</td><td>' + f(r.f1) + '</td><td>' + (typeof r.support === 'number' ? r.support : '<span class="ph">[pending]</span>') + '</td></tr>';
    });
    rep += '<tr><td>Overall accuracy</td><td colspan="4">' + (okAcc ? R.accuracy.toFixed(2) + '%' : '<span class="ph">[pending verified result]</span>') + '</td></tr>';
    $('#rep').innerHTML = rep + '</tbody>';
  })();

})();
