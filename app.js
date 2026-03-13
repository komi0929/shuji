/* ======================================
   薬院習字 — Core Application Logic v7
   6-Brush Preset-Driven Engine
   Enhanced mouse + touch rendering
   ====================================== */

(() => {
  'use strict';

  const canvas  = document.getElementById('canvas');
  const ctx     = canvas.getContext('2d');
  const overlay = document.getElementById('transition-overlay');
  const rakkan  = document.getElementById('rakkan');
  const onboard = document.getElementById('onboarding');
  const brushPanel = document.getElementById('brush-panel');

  // ── Active Brush ──────────────────────
  let B = BRUSH_PRESETS[DEFAULT_BRUSH]; // active brush preset
  let brushKey = DEFAULT_BRUSH;

  // ── Constants (fixed) ─────────────────
  const INK_MAX = 1.0;

  // 油煙墨 palette
  const INK = {
    dark:  { r: 8,  g: 5,  b: 2 },
    mid:   { r: 28, g: 22, b: 14 },
    light: { r: 70, g: 58, b: 44 },
    edge:  { r: 5,  g: 3,  b: 1 },
  };

  // ── State ────────────────────────────
  let drawing = false, ink = INK_MAX, sDist = 0, totalDist = 0;
  let ptrId = null, touches = 0;
  let gameMode = false;
  let pts = [];
  const MAX_PTS = 30;

  let sx = 0, sy = 0;
  let pLW, pAlpha = 0.9, pVel = 0, pAngle = 0;
  let bristles = [];

  // ── Helpers ──────────────────────────
  const _dpr   = () => window.devicePixelRatio || 1;
  const _clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const _lerp  = (a, b, t) => a + (b - a) * t;

  function resize() {
    const r = _dpr();
    canvas.width  = innerWidth  * r;
    canvas.height = innerHeight * r;
    canvas.style.width  = innerWidth  + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  function clear() {
    const r = _dpr();
    ctx.clearRect(0, 0, canvas.width / r, canvas.height / r);
  }

  function initBristles() {
    bristles = [];
    const n = B.bristleN;
    for (let i = 0; i < n; i++) {
      bristles.push({
        pos: (i / (n - 1)) * B.bristleSpread * 2 - B.bristleSpread,
        wobble: (Math.random() - 0.5) * 0.06,
        inkBias: 0.65 + Math.random() * 0.35,
        w: 0.4 + Math.random() * 0.6,
      });
    }
  }

  function resetBrush() {
    pLW = B.initLW;
    ink = INK_MAX;
    totalDist = 0;
    initBristles();
  }

  // ── Brush Selection ───────────────────
  function selectBrush(key) {
    if (!BRUSH_PRESETS[key]) return;
    brushKey = key;
    B = BRUSH_PRESETS[key];
    resetBrush();
    clear();
    // Update UI
    document.querySelectorAll('.brush-option').forEach(el => {
      el.classList.toggle('active', el.dataset.brush === key);
    });
  }

  function showBrushPanel() {
    if (brushPanel) brushPanel.classList.add('visible');
  }

  function hideBrushPanel() {
    if (brushPanel) brushPanel.classList.remove('visible');
  }

  // ── Pressure Detection ───────────────
  // Enhanced: simulates dynamic pressure for mouse input
  function getPressure(e) {
    // Real pen pressure (e.g. Wacom, Apple Pencil)
    if (e.pressure > 0 && e.pressure !== 0.5) {
      return _clamp(e.pressure, 0, 1);
    }
    // Touch: use contact area as pressure proxy
    if (e.pointerType === 'touch' && e.width > 0) {
      const area = Math.max(e.width, e.height || e.width);
      return _clamp((area - 12) / 45, 0.1, 1.0);
    }
    // Mouse: simulate pressure from speed
    // Slow = heavy press (thick), Fast = light press (thin)
    if (e.pointerType === 'mouse') {
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      const speed = Math.hypot(dx, dy);
      // Slow movement (0-3px) = high pressure, fast (>15px) = light
      return _clamp(1.0 - speed / 20, 0.3, 0.95);
    }
    return 0.6;
  }

  // ── Ink Color ────────────────────────
  function inkStr(inkLvl, vel, edge) {
    const c = inkLvl * _clamp(1 - vel / 8, 0.1, 1);
    const d = edge ? INK.edge : INK.dark;
    const l = INK.light;
    return `rgb(${Math.round(_lerp(l.r, d.r, c))},${Math.round(_lerp(l.g, d.g, c))},${Math.round(_lerp(l.b, d.b, c))})`;
  }

  // ── Line Width (preset-driven) ───────
  function calcLW(vel, pressure, inkLvl) {
    const press = Math.pow(_clamp(pressure, 0, 1), B.pressurePow) * (1 - B.pressureMin) + B.pressureMin;
    // Velocity is capped more aggressively so fast mouse drags don't collapse width
    const velNorm = _clamp(vel / B.speedDiv, 0, 1);
    const speed = Math.pow(1 - velNorm, B.speedPow);
    const inkF = 0.5 + inkLvl * 0.5;
    let target = B.minLW + (B.maxLW - B.minLW) * speed * press * inkF;

    // Ensure minimum visible width — never invisible
    target = Math.max(target, B.minLW * 0.8);

    // Auto-swell: automatic beautiful width variation
    if (B.autoSwell > 0) {
      const entryFade = Math.exp(-sDist * 0.006);
      const entrySwell = entryFade * B.autoSwell * 0.7;
      const wave = Math.sin(sDist * B.autoSwellFreq) * B.autoSwell;
      target *= (1 + entrySwell + wave);
    }

    // Wobble for keimou (chicken feather) — pokopoko undulation
    if (B.wobbleAmp > 0) {
      const wobble = Math.sin(sDist * B.wobbleFreq) * B.wobbleAmp;
      target += wobble;
    }

    const smooth = vel > 2 ? B.lwSmoothFast : B.lwSmoothSlow;
    return _lerp(pLW, target, smooth);
  }

  // ── Alpha (preset-driven) ────────────
  function calcAlpha(vel, inkLvl, pressure) {
    // Speed-based alpha: gentler reduction so strokes stay opaque
    const sp = _clamp(1 - vel / 10, 0.15, 1);
    const ik = 0.15 + Math.pow(_clamp(inkLvl, 0, 1), 0.5) * 0.85;
    const pr = 0.5 + pressure * 0.5;
    return _clamp(0.92 * sp * ik * pr, 0.04, 0.95);
  }

  // ── Onboarding ───────────────────────
  function handleOnboarding() {
    const k = 'yakuin_shuji_v6_onboarded';
    if (localStorage.getItem(k)) { onboard.classList.add('hidden'); return; }
    setTimeout(() => {
      onboard.classList.add('fade-out');
      setTimeout(() => onboard.classList.add('hidden'), 1600);
    }, 3500);
    localStorage.setItem(k, '1');
  }

  // ══════════════════════════════════════
  //      DRAWING ENGINE v7 (Enhanced)
  // ══════════════════════════════════════

  function drawSegment(x0, y0, x1, y1, lw0, lw1, alpha, vel, inkLvl, pressure) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    if (dist < 0.3) return;

    const inkConc = Math.pow(_clamp(inkLvl, 0, 1), 0.4);
    const dryBrush = inkLvl < B.kasureDryThreshold;
    if (inkLvl < 0.005) return;

    const angle = Math.atan2(y1 - y0, x1 - x0);
    const perp = angle + Math.PI / 2;
    const step = Math.max(0.6, Math.min(lw1 * 0.1, 2));
    const steps = Math.max(1, Math.ceil(dist / step));
    const dryness = _clamp((1 - inkLvl) * 1.4 + vel / 7, 0, 1);

    ctx.save();

    // ── Core Ink ──
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = _lerp(x0, x1, t);
      const y = _lerp(y0, y1, t);
      const r = _lerp(lw0, lw1, t) / 2;
      if (r < 0.2) continue;

      let dotAlpha = alpha * inkConc;

      // ── Kasure per brush style ──
      if (dryBrush) {
        if (B.kasureStyle === 'smooth') {
          // Smooth fade — for goat hair brushes
          const variation = (1 - inkLvl / B.kasureDryThreshold) * 0.6;
          dotAlpha *= (1 - variation * Math.random());
          if (inkLvl < 0.06 && Math.random() < (1 - inkLvl / 0.06) * 0.25) continue;

        } else if (B.kasureStyle === 'fiber') {
          // Fiber streaks — for bamboo and rabbit
          // Stronger parallel gaps: use angle-aligned fiber channels
          const fiberAngle = Math.atan2(y1 - y0, x1 - x0);
          const crossCoord = Math.cos(fiberAngle + Math.PI/2) * x + Math.sin(fiberAngle + Math.PI/2) * y;
          const fiberChannel = Math.sin(crossCoord * 0.25) * Math.sin(crossCoord * 0.6 + 2.1);
          const dryLevel = 1 - inkLvl / B.kasureDryThreshold;
          const gapThreshold = 1 - dryLevel * 1.8;
          if (fiberChannel > gapThreshold) {
            dotAlpha *= 0.08; // very faint — white gap showing through
          }
          dotAlpha *= (0.4 + Math.random() * 0.6);

        } else if (B.kasureStyle === 'bounce') {
          // Pokopoko bounce — for chicken feather
          const bouncePhase = Math.sin(totalDist * 0.04 + sDist * 0.06);
          const dryLevel = 1 - inkLvl / B.kasureDryThreshold;
          const bounceFactor = 0.5 + bouncePhase * 0.5;
          dotAlpha *= _clamp(bounceFactor + (1 - dryLevel) * 0.5, 0.1, 1);
        }
      }

      // ── Always-on fiber texture for bamboo brush (even with full ink) ──
      if (B.kasureStyle === 'fiber' && !dryBrush && r > 4) {
        const fiberAngle = Math.atan2(y1 - y0, x1 - x0);
        const crossCoord = Math.cos(fiberAngle + Math.PI/2) * x + Math.sin(fiberAngle + Math.PI/2) * y;
        // Subtle fiber texture even when wet — the bamboo splits create permanent gaps
        const wetFiber = Math.sin(crossCoord * 0.35) * Math.sin(crossCoord * 0.8 + 1.5);
        if (wetFiber > 0.65) {
          dotAlpha *= 0.75; // slight dimming along fiber channels
        }
      }
      if (dotAlpha < 0.005) continue;

      // Core dot
      ctx.globalAlpha = dotAlpha * 0.88;
      ctx.fillStyle = inkStr(inkLvl, vel, false);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.93, 0, Math.PI * 2);
      ctx.fill();

      // Edge ring — capillary pooling
      if (r > 5 && inkLvl > B.edgeInkMin && dryness < 0.55) {
        ctx.globalAlpha = dotAlpha * B.edgeAlpha * (1 - dryness);
        ctx.strokeStyle = inkStr(inkLvl, vel, true);
        ctx.lineWidth = Math.max(0.8, r * 0.12);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ── Bristle Texture (骨法) ──
    if (lw1 > 5 && alpha > 0.08 && dryness < 0.80) {
      const bAlpha = alpha * _clamp(B.bristleAlpha + dryness * 0.18, 0.05, 0.35);
      for (const b of bristles) {
        const o0 = (b.pos + b.wobble) * lw0;
        const o1 = (b.pos + b.wobble) * lw1;

        // For fiber kasure: some bristles run dry independently
        let bristleInk = b.inkBias;
        if (B.kasureStyle === 'fiber' && dryBrush) {
          bristleInk *= (0.3 + Math.random() * 0.7);
        }

        ctx.globalAlpha = bAlpha * bristleInk;
        ctx.strokeStyle = inkStr(inkLvl * 0.55, vel, false);
        ctx.lineWidth = b.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0 + Math.cos(perp) * o0, y0 + Math.sin(perp) * o0);
        ctx.lineTo(x1 + Math.cos(perp) * o1, y1 + Math.sin(perp) * o1);
        ctx.stroke();
      }
    }

    // ── Nijimi (潤筆 — wet brush bleed) ──
    if (vel < B.nijimiThreshold && inkLvl > B.nijimiInkMin && lw1 > 10) {
      ctx.globalAlpha = alpha * B.nijimiAlpha;
      ctx.fillStyle = inkStr(inkLvl, 0, false);
      ctx.filter = 'blur(3px)';
      const ns = Math.max(1, Math.ceil(steps / 6));
      for (let i = 0; i <= ns; i++) {
        const t = i / ns;
        ctx.beginPath();
        ctx.arc(_lerp(x0, x1, t), _lerp(y0, y1, t), _lerp(lw0, lw1, t) * B.nijimiRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = 'none';
    }

    ctx.restore();
    pAngle = angle;
  }

  // ── Harai Taper v3 (preset-driven) ───
  function drawTaper(points) {
    if (points.length < 3) return;
    const N = points.length;
    const last  = points[N - 1];
    const prev  = points[N - 2];

    if (last.vel < B.taperVelThreshold) return;

    const recentN = Math.min(N, 5);
    let avgVel = 0;
    for (let i = N - recentN; i < N; i++) avgVel += points[i].vel;
    avgVel /= recentN;
    if (avgVel < B.taperAvgThreshold) return;

    const dx = last.x - prev.x, dy = last.y - prev.y;
    const exitDist = Math.hypot(dx, dy);
    if (exitDist < 0.5) return;
    const exitAngle = Math.atan2(dy, dx);

    let curvature = 0;
    if (N >= 3) {
      const p2 = points[N - 3];
      const a1 = Math.atan2(prev.y - p2.y, prev.x - p2.x);
      const a2 = Math.atan2(last.y - prev.y, last.x - prev.x);
      let dA = a2 - a1;
      while (dA > Math.PI) dA -= 2 * Math.PI;
      while (dA < -Math.PI) dA += 2 * Math.PI;
      const segLen = Math.hypot(prev.x - p2.x, prev.y - p2.y) + exitDist;
      if (segLen > 2) curvature = _clamp(dA / segLen, -0.004, 0.004);
    }

    const endVel = last.vel;
    const baseLW = last.lw;
    const taperLen = _clamp(endVel * 25 + baseLW * 1.5, 15, 120) * B.taperLenMultiplier;
    const steps = Math.max(16, Math.floor(taperLen / 1.2));
    const color = inkStr(last.ink, last.vel, false);

    ctx.save();
    ctx.lineCap = 'round';

    const bN = 3;
    const taperBristles = [];
    for (let i = 0; i < bN; i++) {
      taperBristles.push({ offset: (i / (bN - 1)) * 0.6 - 0.3, ink: 0.6 + i * 0.15, w: 0.3 });
    }

    let px = last.x, py = last.y;
    let curAngle = exitAngle;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const stepDist = taperLen / steps;
      const curveDecay = 1 - t * 0.7;
      curAngle += curvature * stepDist * curveDecay;

      const fx = px + Math.cos(curAngle) * stepDist;
      const fy = py + Math.sin(curAngle) * stepDist;

      let widthRatio;
      if (t < 0.1) {
        widthRatio = 1.0 - t * 0.5;
      } else {
        const taperT = (t - 0.1) / 0.9;
        widthRatio = 0.95 * Math.pow(1 - taperT, 2.2);
      }

      const r = Math.max(0.1, baseLW * widthRatio / 2);
      const alphaT = t < 0.2 ? 1.0 : Math.pow(1 - (t - 0.2) / 0.8, 1.5);
      const a = Math.max(0.005, last.alpha * alphaT);
      const perpA = curAngle + Math.PI / 2;

      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();

      if (t > 0.35 && r > 1.0) {
        const separation = _clamp((t - 0.35) / 0.65, 0, 1);
        for (const b of taperBristles) {
          const bOff = b.offset * baseLW * widthRatio * (1 + separation * 0.8);
          const bx = Math.cos(perpA) * bOff;
          const by = Math.sin(perpA) * bOff;
          const bAlpha = a * b.ink * _clamp(separation * 0.15, 0.005, 0.1);
          if (bAlpha < 0.003) continue;
          ctx.globalAlpha = bAlpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = b.w;
          ctx.beginPath();
          ctx.moveTo(px + bx, py + by);
          ctx.lineTo(fx + bx, fy + by);
          ctx.stroke();
        }
      }

      px = fx; py = fy;
    }
    ctx.restore();
  }

  // ── Entry dot (入筆) ─────────────────
  function drawEntry(x, y, pressure) {
    if (ink < 0.03) return;
    const p = _clamp(pressure, 0.15, 1);
    const r = B.minLW + (B.maxLW - B.minLW) * p * B.entryDotScale;
    ctx.save();
    ctx.globalAlpha = 0.78 * _clamp(ink / 0.3, 0.1, 1);
    ctx.fillStyle = inkStr(ink, 0, false);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    if (ink > 0.3) {
      ctx.globalAlpha = 0.03;
      ctx.filter = 'blur(3px)';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = 'none';
    }
    ctx.restore();
  }

  // ── Pointer Handlers ─────────────────

  function onDown(e) {
    touches++;
    if (touches >= 2) { cancel(); discard(); return; }
    if (gameMode) return;
    if (ptrId !== null) return;

    ptrId = e.pointerId;
    drawing = true;
    // Full ink reset per stroke — each stroke starts fresh
    ink = INK_MAX;
    sDist = 0;
    pts = [];
    initBristles();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const pressure = getPressure(e);

    sx = x; sy = y;
    pLW = B.minLW + (B.maxLW - B.minLW) * Math.pow(pressure, 0.45) * 0.3;
    pAlpha = 0.9; pVel = 0; pAngle = 0;

    pts.push({ x, y, time: performance.now(), vel: 0, lw: pLW, alpha: pAlpha, ink, pressure });

    drawEntry(x, y, pressure);

    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onMove(e) {
    if (gameMode || !drawing || e.pointerId !== ptrId || touches >= 2) return;

    const now = performance.now();
    const rect = canvas.getBoundingClientRect();
    const rx = e.clientX - rect.left, ry = e.clientY - rect.top;

    sx = _lerp(sx, rx, B.smoothing);
    sy = _lerp(sy, ry, B.smoothing);
    const x = sx, y = sy;

    const last = pts[pts.length - 1];
    const d = Math.hypot(x - last.x, y - last.y);
    if (d < 1) return;

    const dt = now - last.time;
    // Cap velocity to prevent extreme values from mouse drags
    const rawVel = dt > 0 ? d / dt : pVel;
    const vel = _clamp(rawVel, 0, 8);
    const pressure = getPressure(e);
    const lw = calcLW(vel, pressure, ink);
    const alpha = calcAlpha(vel, ink, pressure);

    // Ink depletes per-stroke only — sDist resets each new stroke
    ink = Math.max(B.inkFloor || 0, ink - d * (vel < 0.8 ? B.inkDecayBase : B.inkDecayFast));
    sDist += d;
    totalDist += d;

    drawSegment(last.x, last.y, x, y, last.lw, lw, alpha, vel, ink, pressure);

    // Game mode: check hit detection
    if (gameMode && typeof GameEngine !== 'undefined' && GameEngine.active) {
      GameEngine.checkHit(x, y, lw / 2);
    }

    const pt = { x, y, time: now, vel, lw, alpha, ink, pressure };
    pts.push(pt);
    if (pts.length > MAX_PTS) pts.shift();

    pLW = lw; pAlpha = alpha; pVel = vel;
    e.preventDefault();
  }

  function onUp(e) {
    touches = Math.max(0, touches - 1);
    if (e.pointerId === ptrId) {
      if (drawing && pts.length >= 3 && sDist > 8) drawTaper(pts);
      drawing = false;
      ptrId = null;
      pts = [];
    }
  }

  function cancel() {
    drawing = false; ptrId = null; pts = [];
  }

  function discard() {
    overlay.classList.remove('fade-out');
    overlay.classList.add('flash');
    setTimeout(() => {
      clear();
      ink = INK_MAX; totalDist = 0;
      overlay.classList.remove('flash');
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.classList.remove('fade-out');
        touches = 0;
        showBrushPanel();
      }, 400);
    }, 120);
  }

  // ── Rakkan tap handler ── toggles game mode ───
  function onRakkanTap(e) {
    e.preventDefault();
    e.stopPropagation();

    if (gameMode) {
      // Exit game → return to calligraphy
      gameMode = false;
      if (typeof GameEngine !== 'undefined') GameEngine.stop();
      document.body.classList.remove('game-active');
      rakkan.classList.remove('game-active');
      const r = _dpr();
      ctx.clearRect(0, 0, canvas.width / r, canvas.height / r);
      ink = INK_MAX; totalDist = 0;
      showBrushPanel();
    } else {
      // Enter game → CYBER SURVIVOR
      gameMode = true;
      document.body.classList.add('game-active');
      rakkan.classList.add('game-active');
      hideBrushPanel();
      const r = _dpr();
      ctx.clearRect(0, 0, canvas.width / r, canvas.height / r);
      ink = INK_MAX; totalDist = 0;
      if (typeof GameEngine !== 'undefined') {
        GameEngine.start(canvas, ctx);
      }
    }
  }

  function onTS(e) { if (e.touches.length >= 2) { cancel(); discard(); e.preventDefault(); } }
  function onTM(e) { if (e.touches.length >= 2) e.preventDefault(); }
  function prev(e) { e.preventDefault(); }

  function init() {
    resetBrush();
    resize();
    addEventListener('resize', resize);
    canvas.addEventListener('pointerdown',   onDown, {passive:false});
    canvas.addEventListener('pointermove',   onMove, {passive:false});
    canvas.addEventListener('pointerup',     onUp,   {passive:false});
    canvas.addEventListener('pointercancel', onUp,   {passive:false});
    canvas.addEventListener('touchstart', onTS, {passive:false});
    canvas.addEventListener('touchmove',  onTM, {passive:false});
    canvas.addEventListener('contextmenu', prev);
    document.addEventListener('contextmenu', prev);
    document.addEventListener('touchmove', e => { if(e.touches.length>0) e.preventDefault(); }, {passive:false});

    // Rakkan tap — toggle game mode
    rakkan.addEventListener('pointerdown', onRakkanTap, {passive:false});

    // Game replay button
    const replayBtn = document.getElementById('game-replay');
    if (replayBtn) {
      replayBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (typeof GameEngine !== 'undefined') GameEngine.replay(canvas, ctx);
      }, {passive:false});
    }

    // Game exit button
    const exitBtn = document.getElementById('game-exit');
    if (exitBtn) {
      exitBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        gameMode = false;
        if (typeof GameEngine !== 'undefined') GameEngine.stop();
        document.body.classList.remove('game-active');
        rakkan.classList.remove('game-active');
        clear(); ink = INK_MAX; totalDist = 0;
        showBrushPanel();
      }, {passive:false});
    }

    // Brush selector panel
    document.querySelectorAll('.brush-option').forEach(el => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        selectBrush(el.dataset.brush);
        hideBrushPanel();
      }, {passive:false});
    });

    // Brush change button (top-right)
    const brushBtn = document.getElementById('brush-change-btn');
    if (brushBtn) {
      brushBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        showBrushPanel();
      }, {passive:false});
    }

    // Show brush panel on first load
    showBrushPanel();

    handleOnboarding();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
