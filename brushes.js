/* ======================================
   薬院習字 — 6種の筆プリセット v3
   Dramatically improved for mouse + touch
   Each brush is boldly distinct and visually stunning
   ====================================== */

const BRUSH_PRESETS = {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. 羊毛筆（太）— Thick Goat Hair
  //    ふっくら丸い太字、墨たっぷり、潤筆の極致
  //    Reference: 春の日差し「風」
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  youmou_thick: {
    name: '羊毛筆（太）',
    desc: 'ふっくら潤筆',
    // Width range: always thick and plump
    minLW: 12,
    maxLW: 72,
    // Pressure: extremely soft response — stays thick
    pressurePow: 0.20,
    pressureMin: 0.55,
    // Speed: very gentle thinning — stays fat even when fast
    speedPow: 0.6,
    speedDiv: 6,
    // Auto-swell: gentle organic pulsing
    autoSwell: 0.18,
    autoSwellFreq: 0.012,
    // Ink: extremely wet — lasts long, no quick dry-out
    inkDecayBase: 0.00008,
    inkDecayFast: 0.00018,
    inkFloor: 0.03,
    // Bristles: dense, soft, many — ふっくら感
    bristleN: 12,
    bristleSpread: 0.50,
    bristleAlpha: 0.08,
    // Nijimi — very wet/pooling (signature of youmou)
    nijimiThreshold: 0.8,
    nijimiAlpha: 0.050,
    nijimiRadius: 0.58,
    nijimiInkMin: 0.15,
    // Kasure: graceful smooth fade
    kasureStyle: 'smooth',
    kasureDryThreshold: 0.15,
    // Smoothing — buttery smooth
    smoothing: 0.50,
    // Entry dot: prominent, showing ink pooling on contact
    entryDotScale: 0.55,
    // Edge darkening: strong capillary effect
    edgeAlpha: 0.35,
    edgeInkMin: 0.10,
    // No wobble
    wobbleAmp: 0,
    wobbleFreq: 0,
    initLW: 32,
    // Taper: long, elegant sweep
    taperVelThreshold: 2.5,
    taperAvgThreshold: 1.5,
    taperLenMultiplier: 1.3,
    lwSmoothFast: 0.25,
    lwSmoothSlow: 0.15,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. 羊毛筆 — Standard Goat Hair
  //    Balanced: dramatic thick-thin contrast (強弱)
  //    Reference: general-purpose elegant calligraphy
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  youmou_std: {
    name: '羊毛筆',
    desc: '強弱自在',
    minLW: 3,
    maxLW: 48,
    pressurePow: 0.40,
    pressureMin: 0.25,
    speedPow: 1.2,
    speedDiv: 5,
    autoSwell: 0.20,
    autoSwellFreq: 0.018,
    inkDecayBase: 0.00012,
    inkDecayFast: 0.00028,
    inkFloor: 0.02,
    bristleN: 8,
    bristleSpread: 0.42,
    bristleAlpha: 0.12,
    nijimiThreshold: 0.4,
    nijimiAlpha: 0.020,
    nijimiRadius: 0.48,
    nijimiInkMin: 0.35,
    kasureStyle: 'smooth',
    kasureDryThreshold: 0.22,
    smoothing: 0.62,
    entryDotScale: 0.42,
    edgeAlpha: 0.25,
    edgeInkMin: 0.15,
    wobbleAmp: 0,
    wobbleFreq: 0,
    initLW: 16,
    taperVelThreshold: 2.0,
    taperAvgThreshold: 1.5,
    taperLenMultiplier: 1.1,
    lwSmoothFast: 0.35,
    lwSmoothSlow: 0.22,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. 長々鋒 — Long Thin Brush (ちょうちょうほう)
  //    Extremely delicate, flowing curves, penmanship
  //    Reference: 穏やかな風 — wispy, floating, ethereal
  //    Like the "道" reference image — thin arcing strokes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  chouchouhou: {
    name: '長々鋒',
    desc: '繊細な細線',
    minLW: 0.8,
    maxLW: 8,
    pressurePow: 0.70,
    pressureMin: 0.15,
    speedPow: 0.5,
    speedDiv: 8,
    autoSwell: 0.08,
    autoSwellFreq: 0.025,
    inkDecayBase: 0.00015,
    inkDecayFast: 0.00035,
    inkFloor: 0.01,
    bristleN: 3,
    bristleSpread: 0.10,
    bristleAlpha: 0.04,
    nijimiThreshold: 0.2,
    nijimiAlpha: 0.008,
    nijimiRadius: 0.22,
    nijimiInkMin: 0.55,
    kasureStyle: 'smooth',
    kasureDryThreshold: 0.12,
    smoothing: 0.45,
    entryDotScale: 0.20,
    edgeAlpha: 0.10,
    edgeInkMin: 0.30,
    wobbleAmp: 0,
    wobbleFreq: 0,
    initLW: 3.5,
    taperVelThreshold: 1.2,
    taperAvgThreshold: 0.8,
    taperLenMultiplier: 2.2,
    lwSmoothFast: 0.45,
    lwSmoothSlow: 0.30,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. 兎毛筆 — Rabbit Whisker
  //    Sharp, angular, high contrast, dramatic speed-thin
  //    Reference: 肌に刺さる冷たい風 — razor-sharp lines
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  usagi: {
    name: '兎毛筆',
    desc: '鋭い硬筆',
    minLW: 1.5,
    maxLW: 32,
    pressurePow: 0.55,
    pressureMin: 0.15,
    speedPow: 1.8,
    speedDiv: 5,
    autoSwell: 0.25,
    autoSwellFreq: 0.028,
    inkDecayBase: 0.00015,
    inkDecayFast: 0.00035,
    inkFloor: 0.02,
    bristleN: 5,
    bristleSpread: 0.28,
    bristleAlpha: 0.10,
    nijimiThreshold: 0.25,
    nijimiAlpha: 0.006,
    nijimiRadius: 0.28,
    nijimiInkMin: 0.55,
    kasureStyle: 'fiber',
    kasureDryThreshold: 0.18,
    smoothing: 0.75,
    entryDotScale: 0.30,
    edgeAlpha: 0.14,
    edgeInkMin: 0.22,
    wobbleAmp: 0,
    wobbleFreq: 0,
    initLW: 10,
    taperVelThreshold: 1.5,
    taperAvgThreshold: 1.0,
    taperLenMultiplier: 1.8,
    lwSmoothFast: 0.55,
    lwSmoothSlow: 0.35,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. 竹筆 — Bamboo Brush
  //    Dramatic fiber streaks, バサバサ, bold and wild
  //    Reference: 竹を割いた筆 — like the "風" reference
  //    with massive bold strokes and kasure
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  take: {
    name: '竹筆',
    desc: 'バサバサの線',
    minLW: 8,
    maxLW: 68,
    pressurePow: 0.30,
    pressureMin: 0.40,
    speedPow: 0.7,
    speedDiv: 5,
    autoSwell: 0.22,
    autoSwellFreq: 0.015,
    inkDecayBase: 0.00020,
    inkDecayFast: 0.00045,
    inkFloor: 0.00,
    bristleN: 20,
    bristleSpread: 1.0,
    bristleAlpha: 0.32,
    nijimiThreshold: 0.15,
    nijimiAlpha: 0.003,
    nijimiRadius: 0.25,
    nijimiInkMin: 0.70,
    kasureStyle: 'fiber',
    kasureDryThreshold: 0.45,
    smoothing: 0.70,
    entryDotScale: 0.45,
    edgeAlpha: 0.05,
    edgeInkMin: 0.25,
    wobbleAmp: 0,
    wobbleFreq: 0,
    initLW: 24,
    taperVelThreshold: 2.5,
    taperAvgThreshold: 1.8,
    taperLenMultiplier: 0.7,
    lwSmoothFast: 0.35,
    lwSmoothSlow: 0.20,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. 鶏毛筆 — Chicken Feather
  //    Sticky, bouncing, ペタペタ undulation
  //    Reference: じとじと湿度の多い真夏の風
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  keimou: {
    name: '鶏毛筆',
    desc: 'ペタペタ質感',
    minLW: 4,
    maxLW: 38,
    pressurePow: 0.40,
    pressureMin: 0.22,
    speedPow: 0.9,
    speedDiv: 5,
    autoSwell: 0.35,
    autoSwellFreq: 0.055,
    inkDecayBase: 0.00016,
    inkDecayFast: 0.00035,
    inkFloor: 0.01,
    bristleN: 7,
    bristleSpread: 0.38,
    bristleAlpha: 0.14,
    nijimiThreshold: 0.55,
    nijimiAlpha: 0.030,
    nijimiRadius: 0.52,
    nijimiInkMin: 0.25,
    kasureStyle: 'bounce',
    kasureDryThreshold: 0.28,
    smoothing: 0.58,
    entryDotScale: 0.38,
    edgeAlpha: 0.24,
    edgeInkMin: 0.15,
    wobbleAmp: 4.0,
    wobbleFreq: 0.065,
    initLW: 14,
    taperVelThreshold: 3.0,
    taperAvgThreshold: 2.2,
    taperLenMultiplier: 0.5,
    lwSmoothFast: 0.32,
    lwSmoothSlow: 0.20,
  },
};

const DEFAULT_BRUSH = 'youmou_std';
