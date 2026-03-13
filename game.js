/* ======================================
   CYBER SURVIVOR — Neon Arcade Game
   The polar opposite of zen calligraphy
   ====================================== */

const GameEngine = (() => {
  'use strict';

  // ═══════════════════════════════════════
  //   CONFIGURATION
  // ═══════════════════════════════════════
  const CFG = {
    // Player
    playerR: 14,
    playerSpeed: 5,
    playerMaxHP: 3,
    playerTrailLen: 12,
    invincibleTime: 800,

    // Shooting — slower and weaker to let enemies through
    shootInterval: 320,      // ms auto-fire rate (was 180)
    bulletSpeed: 7,
    bulletR: 3,
    bulletLifetime: 600,

    // Enemies — fast and aggressive
    spawnInterval: 800,      // initial ms (was 1200)
    spawnIntervalMin: 200,
    maxEnemies: 35,
    enemyBaseSpeed: 2.8,     // much faster (was 1.2)

    // Waves
    waveDuration: 15,        // seconds per wave (was 20)
    waveEnemyMult: 1.4,

    // Power-ups
    powerUpChance: 0.12,
    powerUpDuration: 5000,
    powerUpR: 12,

    // Visuals
    gridSpacing: 50,
    gridScroll: 0.3,
    shakeDecay: 0.88,
    trailAlpha: 0.4,
  };

  // ═══════════════════════════════════════
  //   NEON PALETTE
  // ═══════════════════════════════════════
  const NEON = {
    pink:     '#ff2d95',
    blue:     '#00d4ff',
    green:    '#39ff14',
    purple:   '#bf40ff',
    orange:   '#ff6a00',
    yellow:   '#ffe100',
    white:    '#ffffff',
    darkBg:   '#0a0a14',
    gridLine: 'rgba(0, 212, 255, 0.08)',
    gridBright: 'rgba(0, 212, 255, 0.18)',
  };

  // Enemy types
  const ENEMY_TYPES = {
    drone:   { r: 10, speed: 1.0, hp: 1, color: NEON.pink,   score: 10, shape: 'diamond' },
    fast:    { r: 7,  speed: 2.8, hp: 1, color: NEON.green,  score: 15, shape: 'triangle' },
    tank:    { r: 18, speed: 0.7, hp: 5, color: NEON.orange, score: 30, shape: 'hexagon' },
    bomber:  { r: 13, speed: 1.2, hp: 2, color: NEON.purple, score: 20, shape: 'square' },
  };

  const POWERUP_TYPES = [
    { type: 'shield',    color: NEON.blue,   label: 'SHIELD',      icon: '◈' },
    { type: 'speed',     color: NEON.green,   label: 'SPEED UP',   icon: '⚡' },
    { type: 'multishot', color: NEON.pink,    label: 'MULTI-SHOT', icon: '✦' },
    { type: 'heal',      color: NEON.yellow,  label: '+HP',        icon: '♥' },
  ];

  // ═══════════════════════════════════════
  //   STATE
  // ═══════════════════════════════════════
  let active = false;
  let _canvas, _ctx;
  let W, H;   // canvas logical dimensions
  let animFrame;
  let lastTime = 0;

  // Player
  let player = null;
  let targetX, targetY;
  let touching = false;

  // Game objects
  let bullets = [];
  let enemies = [];
  let particles = [];
  let powerUps = [];
  let floatingTexts = [];

  // Timing
  let lastShot = 0;
  let lastSpawn = 0;
  let spawnInterval;

  // Score
  let score = 0;
  let combo = 0;
  let lastKillTime = 0;
  let kills = 0;
  let wave = 1;
  let waveTimer = 0;
  let highScore = parseInt(localStorage.getItem('cyber_highscore') || '0', 10);

  // Effects
  let shake = { x: 0, y: 0, intensity: 0 };
  let gridOffset = 0;
  let flashAlpha = 0;

  // Active power-ups
  let activePowers = {};

  // UI elements
  let gameUI, hpBar, scoreEl, waveEl, comboEl, resultOverlay;

  // ═══════════════════════════════════════
  //   HELPERS
  // ═══════════════════════════════════════
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function glow(ctx, color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }
  function noGlow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // ═══════════════════════════════════════
  //   PLAYER
  // ═══════════════════════════════════════
  function createPlayer() {
    return {
      x: W / 2,
      y: H * 0.65,
      hp: CFG.playerMaxHP,
      trail: [],
      invincible: 0,
      alive: true,
    };
  }

  function updatePlayer(dt) {
    if (!player.alive) return;

    const speed = activePowers.speed ? CFG.playerSpeed * 1.6 : CFG.playerSpeed;

    if (touching) {
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        const move = Math.min(speed, d * 0.15);
        player.x += (dx / d) * move;
        player.y += (dy / d) * move;
      }
    }

    // Clamp to screen
    player.x = clamp(player.x, CFG.playerR, W - CFG.playerR);
    player.y = clamp(player.y, CFG.playerR, H - CFG.playerR);

    // Trail
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > CFG.playerTrailLen) player.trail.pop();

    // Invincibility timer
    if (player.invincible > 0) player.invincible -= dt;
  }

  function drawPlayer(ctx, now) {
    if (!player.alive) return;

    const blink = player.invincible > 0 && Math.sin(now / 60) > 0;
    if (blink) return;

    // Trail
    for (let i = 1; i < player.trail.length; i++) {
      const t = 1 - i / player.trail.length;
      const p = player.trail[i];
      ctx.globalAlpha = t * CFG.trailAlpha;
      glow(ctx, NEON.blue, 8 * t);
      ctx.fillStyle = NEON.blue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CFG.playerR * t * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main body
    ctx.globalAlpha = 1;
    const pulse = 1 + Math.sin(now / 150) * 0.08;
    const r = CFG.playerR * pulse;

    // Outer glow
    glow(ctx, NEON.blue, 25);
    ctx.fillStyle = NEON.blue;
    ctx.beginPath();
    ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    noGlow(ctx);
    ctx.fillStyle = NEON.white;
    ctx.beginPath();
    ctx.arc(player.x, player.y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Shield visual
    if (activePowers.shield) {
      ctx.globalAlpha = 0.3 + Math.sin(now / 200) * 0.15;
      glow(ctx, NEON.blue, 15);
      ctx.strokeStyle = NEON.blue;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      noGlow(ctx);
    }
  }

  // ═══════════════════════════════════════
  //   BULLETS (auto-fire)
  // ═══════════════════════════════════════
  function autoShoot(now) {
    if (!player.alive) return;
    if (now - lastShot < CFG.shootInterval) return;
    lastShot = now;

    // Find nearest enemy
    let nearest = null;
    let nearDist = Infinity;
    for (const e of enemies) {
      const d = dist(player, e);
      if (d < nearDist) { nearDist = d; nearest = e; }
    }

    if (!nearest) return;

    const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);

    // Main bullet
    fireBullet(angle);

    // Multi-shot: fire 2 extra at ±15°
    if (activePowers.multishot) {
      fireBullet(angle - 0.26);
      fireBullet(angle + 0.26);
    }
  }

  function fireBullet(angle) {
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * CFG.bulletSpeed,
      vy: Math.sin(angle) * CFG.bulletSpeed,
      born: performance.now(),
      r: CFG.bulletR,
    });
  }

  function updateBullets(now) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Remove if off-screen or expired
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20 ||
          now - b.born > CFG.bulletLifetime) {
        bullets.splice(i, 1);
      }
    }
  }

  function drawBullets(ctx) {
    ctx.globalAlpha = 1;
    for (const b of bullets) {
      glow(ctx, NEON.yellow, 12);
      ctx.fillStyle = NEON.yellow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();

      // Bullet trail
      ctx.globalAlpha = 0.3;
      noGlow(ctx);
      ctx.strokeStyle = NEON.yellow;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 2, b.y - b.vy * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    noGlow(ctx);
  }

  // ═══════════════════════════════════════
  //   ENEMIES
  // ═══════════════════════════════════════
  function spawnEnemy() {
    const types = Object.keys(ENEMY_TYPES);

    // Weight distribution changes per wave
    let typeKey;
    const roll = Math.random();
    if (wave < 3) {
      typeKey = roll < 0.7 ? 'drone' : 'fast';
    } else if (wave < 5) {
      typeKey = roll < 0.4 ? 'drone' : roll < 0.7 ? 'fast' : roll < 0.9 ? 'bomber' : 'tank';
    } else {
      typeKey = roll < 0.25 ? 'drone' : roll < 0.5 ? 'fast' : roll < 0.75 ? 'bomber' : 'tank';
    }

    const type = ENEMY_TYPES[typeKey];
    const speedMult = 1 + (wave - 1) * 0.15;

    // Spawn from edges
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
      case 0: x = rand(0, W); y = -30; break;            // top
      case 1: x = W + 30; y = rand(0, H); break;         // right
      case 2: x = rand(0, W); y = H + 30; break;         // bottom
      case 3: x = -30; y = rand(0, H); break;             // left
    }

    enemies.push({
      x, y,
      hp: type.hp,
      maxHp: type.hp,
      r: type.r,
      speed: type.speed * CFG.enemyBaseSpeed * speedMult,
      color: type.color,
      score: type.score,
      shape: type.shape,
      phase: Math.random() * Math.PI * 2,
      typeKey,
    });
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      // Move toward player
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        // Add slight sine wobble
        const wobble = Math.sin(performance.now() / 400 + e.phase) * 0.3;
        e.x += (dx / d) * e.speed + wobble;
        e.y += (dy / d) * e.speed;
      }
    }
  }

  function drawEnemies(ctx, now) {
    for (const e of enemies) {
      ctx.globalAlpha = 1;
      const pulse = 1 + Math.sin(now / 250 + e.phase) * 0.1;
      const r = e.r * pulse;

      glow(ctx, e.color, 15);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = e.color + '33';

      ctx.beginPath();
      if (e.shape === 'diamond') {
        drawDiamond(ctx, e.x, e.y, r);
      } else if (e.shape === 'triangle') {
        drawTriangle(ctx, e.x, e.y, r, now);
      } else if (e.shape === 'hexagon') {
        drawPolygon(ctx, e.x, e.y, r, 6);
      } else {
        drawPolygon(ctx, e.x, e.y, r, 4);
      }
      ctx.fill();
      ctx.stroke();

      // HP bar for tanks
      if (e.maxHp > 1) {
        noGlow(ctx);
        ctx.globalAlpha = 0.7;
        const bw = e.r * 2;
        const bh = 3;
        const bx = e.x - bw / 2;
        const by = e.y - e.r - 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = e.color;
        ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
      }
    }
    noGlow(ctx);
  }

  function drawDiamond(ctx, x, y, r) {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
  }

  function drawTriangle(ctx, x, y, r, now) {
    const rot = now / 500;
    for (let i = 0; i < 3; i++) {
      const a = rot + (Math.PI * 2 / 3) * i - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawPolygon(ctx, x, y, r, sides) {
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ═══════════════════════════════════════
  //   COLLISIONS
  // ═══════════════════════════════════════
  function checkCollisions(now) {
    // Bullets vs Enemies
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (dist(b, e) < e.r + b.r + 3) {
          bullets.splice(bi, 1);
          e.hp--;
          spawnHitSparks(b.x, b.y, e.color, 4);

          if (e.hp <= 0) {
            killEnemy(ei, e, now);
          }
          break;
        }
      }
    }

    // Enemies vs Player
    if (player.alive && player.invincible <= 0) {
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (dist(player, e) < CFG.playerR + e.r - 2) {
          if (activePowers.shield) {
            // Shield absorbs hit and destroys enemy
            delete activePowers.shield;
            killEnemy(ei, e, now);
            addShake(6);
          } else {
            player.hp--;
            player.invincible = CFG.invincibleTime;
            addShake(10);
            flashAlpha = 0.4;
            spawnExplosion(player.x, player.y, NEON.blue, 8);
            enemies.splice(ei, 1);

            if (player.hp <= 0) {
              player.alive = false;
              spawnExplosion(player.x, player.y, NEON.blue, 30);
              addShake(20);
              setTimeout(endGame, 1200);
            }
          }
          break;
        }
      }
    }

    // Player vs Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      if (dist(player, p) < CFG.playerR + CFG.powerUpR + 4) {
        collectPowerUp(p, now);
        powerUps.splice(i, 1);
      }
    }
  }

  function killEnemy(index, enemy, now) {
    spawnExplosion(enemy.x, enemy.y, enemy.color, 12);
    addShake(4);

    // Combo
    if (now - lastKillTime < 2000) {
      combo++;
    } else {
      combo = 1;
    }
    lastKillTime = now;
    kills++;

    const mult = Math.min(combo, 10);
    const pts = enemy.score * mult;
    score += pts;

    addFloatingText(enemy.x, enemy.y - 15, `+${pts}`, NEON.white);
    if (combo > 1) {
      addFloatingText(enemy.x, enemy.y + 5, `${combo}x COMBO`, NEON.yellow);
    }

    enemies.splice(index, 1);

    // Power-up drop chance
    if (Math.random() < CFG.powerUpChance) {
      dropPowerUp(enemy.x, enemy.y);
    }
  }

  // ═══════════════════════════════════════
  //   POWER-UPS
  // ═══════════════════════════════════════
  function dropPowerUp(x, y) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerUps.push({
      x, y,
      ...type,
      born: performance.now(),
      lifetime: 8000,
    });
  }

  function collectPowerUp(pu, now) {
    if (pu.type === 'heal') {
      player.hp = Math.min(player.hp + 1, CFG.playerMaxHP);
    } else {
      activePowers[pu.type] = now + CFG.powerUpDuration;
    }
    addFloatingText(pu.x, pu.y - 20, pu.label, pu.color);
    spawnExplosion(pu.x, pu.y, pu.color, 8);
  }

  function updatePowerUps(now) {
    // Remove expired active powers
    for (const key of Object.keys(activePowers)) {
      if (now > activePowers[key]) delete activePowers[key];
    }

    // Remove expired pickup items
    for (let i = powerUps.length - 1; i >= 0; i--) {
      if (now - powerUps[i].born > powerUps[i].lifetime) {
        powerUps.splice(i, 1);
      }
    }
  }

  function drawPowerUps(ctx, now) {
    for (const p of powerUps) {
      const age = now - p.born;
      const fadeOut = p.lifetime - age < 2000 ? (p.lifetime - age) / 2000 : 1;
      const bob = Math.sin(now / 300) * 4;

      ctx.globalAlpha = fadeOut;
      glow(ctx, p.color, 15);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, CFG.powerUpR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, p.x, p.y + bob);
    }
    noGlow(ctx);
  }

  // ═══════════════════════════════════════
  //   PARTICLES
  // ═══════════════════════════════════════
  function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + rand(-0.3, 0.3);
      const speed = rand(2, 6);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: rand(1.5, 4),
        color,
        alpha: 1,
        life: 1,
        decay: rand(0.015, 0.035),
      });
    }
  }

  function spawnHitSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(1, 4);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: rand(1, 2.5),
        color,
        alpha: 0.8,
        life: 1,
        decay: rand(0.03, 0.06),
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay;
      p.alpha = p.life;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles(ctx) {
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      glow(ctx, p.color, 6);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    noGlow(ctx);
  }

  // ═══════════════════════════════════════
  //   FLOATING TEXT
  // ═══════════════════════════════════════
  function addFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.5, life: 1 });
  }

  function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const f = floatingTexts[i];
      f.y += f.vy;
      f.life -= 0.018;
      f.alpha = f.life;
      if (f.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function drawFloatingTexts(ctx) {
    for (const f of floatingTexts) {
      ctx.globalAlpha = f.alpha;
      glow(ctx, f.color, 8);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 16px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    noGlow(ctx);
  }

  // ═══════════════════════════════════════
  //   VISUAL EFFECTS
  // ═══════════════════════════════════════
  function addShake(intensity) {
    shake.intensity = Math.max(shake.intensity, intensity);
  }

  function updateShake() {
    shake.x = (Math.random() - 0.5) * shake.intensity;
    shake.y = (Math.random() - 0.5) * shake.intensity;
    shake.intensity *= CFG.shakeDecay;
    if (shake.intensity < 0.5) shake.intensity = 0;
  }

  function drawGrid(ctx, now) {
    gridOffset = (gridOffset + CFG.gridScroll) % CFG.gridSpacing;

    ctx.globalAlpha = 1;

    // Vertical lines
    for (let x = -CFG.gridSpacing + gridOffset; x < W + CFG.gridSpacing; x += CFG.gridSpacing) {
      const isCenter = Math.abs(x - W / 2) < CFG.gridSpacing;
      ctx.strokeStyle = isCenter ? NEON.gridBright : NEON.gridLine;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = -CFG.gridSpacing + gridOffset; y < H + CFG.gridSpacing; y += CFG.gridSpacing) {
      const isCenter = Math.abs(y - H / 2) < CFG.gridSpacing;
      ctx.strokeStyle = isCenter ? NEON.gridBright : NEON.gridLine;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function drawDamageFlash(ctx) {
    if (flashAlpha > 0) {
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, W, H);
      flashAlpha *= 0.92;
      if (flashAlpha < 0.01) flashAlpha = 0;
    }
  }

  // ═══════════════════════════════════════
  //   HUD (drawn on canvas for full control)
  // ═══════════════════════════════════════
  function drawHUD(ctx, now) {
    ctx.globalAlpha = 1;
    noGlow(ctx);

    // Wave indicator
    ctx.fillStyle = NEON.white;
    ctx.font = 'bold 13px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${wave}`, W / 2, 28);

    // Score
    glow(ctx, NEON.yellow, 4);
    ctx.fillStyle = NEON.yellow;
    ctx.font = 'bold 22px "Orbitron", sans-serif';
    ctx.fillText(score.toString(), W / 2, 54);
    noGlow(ctx);

    // HP bar (bottom center)
    const hpW = 120;
    const hpH = 8;
    const hpX = (W - hpW) / 2;
    const hpY = H - 30;

    ctx.fillStyle = '#222';
    ctx.fillRect(hpX, hpY, hpW, hpH);

    const hpRatio = player.hp / CFG.playerMaxHP;
    const hpColor = hpRatio > 0.5 ? NEON.green : hpRatio > 0.25 ? NEON.orange : NEON.pink;
    glow(ctx, hpColor, 6);
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
    noGlow(ctx);

    // HP label
    ctx.fillStyle = NEON.white;
    ctx.font = '10px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HP', W / 2, hpY - 4);

    // Combo (top right)
    if (combo > 1) {
      ctx.textAlign = 'right';
      glow(ctx, NEON.pink, 8);
      ctx.fillStyle = NEON.pink;
      ctx.font = 'bold 16px "Orbitron", sans-serif';
      ctx.fillText(`${combo}x`, W - 16, 30);
      ctx.font = '10px "Orbitron", sans-serif';
      ctx.fillText('COMBO', W - 16, 44);
      noGlow(ctx);
    }

    // Active power-ups (top left)
    let piX = 16;
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px "Orbitron", sans-serif';
    for (const [key, expiry] of Object.entries(activePowers)) {
      const remaining = (expiry - now) / CFG.powerUpDuration;
      const pu = POWERUP_TYPES.find(p => p.type === key);
      if (!pu) continue;
      ctx.globalAlpha = 0.8;
      glow(ctx, pu.color, 6);
      ctx.fillStyle = pu.color;
      ctx.fillText(`${pu.icon} ${pu.label}`, piX, 28);
      // Timer bar
      noGlow(ctx);
      ctx.fillStyle = pu.color + '44';
      ctx.fillRect(piX, 32, 70, 3);
      ctx.fillStyle = pu.color;
      ctx.fillRect(piX, 32, 70 * remaining, 3);
      piX += 90;
    }

    // Kills count (bottom left)
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'left';
    ctx.fillStyle = NEON.white;
    ctx.font = '10px "Orbitron", sans-serif';
    ctx.fillText(`KILLS: ${kills}`, 16, H - 16);

    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════════════
  //   WAVE MANAGEMENT
  // ═══════════════════════════════════════
  function updateWaves(now, dt) {
    waveTimer += dt;

    // Spawn enemies
    if (now - lastSpawn > spawnInterval && enemies.length < CFG.maxEnemies) {
      spawnEnemy();
      lastSpawn = now;
    }

    // Increase wave
    if (waveTimer > CFG.waveDuration * 1000) {
      wave++;
      waveTimer = 0;
      spawnInterval = Math.max(CFG.spawnIntervalMin, spawnInterval * 0.85);

      // Wave announcement
      addFloatingText(W / 2, H / 2 - 30, `WAVE ${wave}`, NEON.blue);
      addFloatingText(W / 2, H / 2 + 10, 'INCOMING!', NEON.pink);
      addShake(8);

      // Bonus spawn burst
      const burst = Math.min(wave + 2, 8);
      for (let i = 0; i < burst; i++) {
        setTimeout(() => { if (active) spawnEnemy(); }, i * 200);
      }
    }
  }

  // ═══════════════════════════════════════
  //   GAME OVER
  // ═══════════════════════════════════════
  function endGame() {
    active = false;
    cancelAnimationFrame(animFrame);

    const isNew = score > highScore;
    if (isNew) {
      highScore = score;
      localStorage.setItem('cyber_highscore', String(highScore));
    }

    // Show result overlay
    resultOverlay = document.getElementById('game-result');
    if (resultOverlay) {
      const rs = document.getElementById('result-score');
      const rh = document.getElementById('result-high');
      const rn = document.getElementById('result-new');
      const rk = document.getElementById('result-kills');
      const rw = document.getElementById('result-wave');
      if (rs) rs.textContent = score;
      if (rh) rh.textContent = highScore;
      if (rn) rn.style.display = isNew ? 'block' : 'none';
      if (rk) rk.textContent = kills;
      if (rw) rw.textContent = wave;
      resultOverlay.classList.add('visible');
    }
  }

  // ═══════════════════════════════════════
  //   MAIN LOOP
  // ═══════════════════════════════════════
  function gameLoop(timestamp) {
    if (!active) return;

    const dt = lastTime ? timestamp - lastTime : 16;
    lastTime = timestamp;
    const now = performance.now();

    // Update
    updatePlayer(dt);
    autoShoot(now);
    updateBullets(now);
    updateEnemies(dt);
    checkCollisions(now);
    updatePowerUps(now);
    updateParticles();
    updateFloatingTexts();
    updateShake();
    updateWaves(now, dt);

    // Clear
    _ctx.save();
    _ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _ctx.fillStyle = NEON.darkBg;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    _ctx.restore();

    // Apply shake
    _ctx.save();
    _ctx.translate(shake.x, shake.y);

    // Draw
    drawGrid(_ctx, now);
    drawPowerUps(_ctx, now);
    drawBullets(_ctx);
    drawEnemies(_ctx, now);
    drawPlayer(_ctx, now);
    drawParticles(_ctx);
    drawFloatingTexts(_ctx);
    drawDamageFlash(_ctx);
    drawHUD(_ctx, now);

    _ctx.restore();

    animFrame = requestAnimationFrame(gameLoop);
  }

  // ═══════════════════════════════════════
  //   INPUT HANDLING
  // ═══════════════════════════════════════
  function onPointerDown(e) {
    if (!active) return;
    e.preventDefault();
    touching = true;
    const rect = _canvas.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
  }

  function onPointerMove(e) {
    if (!active || !touching) return;
    e.preventDefault();
    const rect = _canvas.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
  }

  function onPointerUp(e) {
    touching = false;
  }

  // ═══════════════════════════════════════
  //   START / STOP / REPLAY
  // ═══════════════════════════════════════
  function start(canvas, ctx) {
    _canvas = canvas;
    _ctx = ctx;

    const dpr = window.devicePixelRatio || 1;
    W = canvas.width / dpr;
    H = canvas.height / dpr;

    // Reset state
    active = true;
    score = 0;
    combo = 0;
    kills = 0;
    wave = 1;
    waveTimer = 0;
    lastShot = 0;
    lastSpawn = 0;
    lastKillTime = 0;
    lastTime = 0;
    spawnInterval = CFG.spawnInterval;
    bullets = [];
    enemies = [];
    particles = [];
    powerUps = [];
    floatingTexts = [];
    activePowers = {};
    shake = { x: 0, y: 0, intensity: 0 };
    flashAlpha = 0;
    gridOffset = 0;

    player = createPlayer();
    targetX = player.x;
    targetY = player.y;
    touching = false;

    // Input
    _canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    _canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    _canvas.addEventListener('pointerup', onPointerUp);
    _canvas.addEventListener('pointercancel', onPointerUp);

    // Hide result
    resultOverlay = document.getElementById('game-result');
    if (resultOverlay) resultOverlay.classList.remove('visible');

    // Wave 1 announcement
    setTimeout(() => {
      addFloatingText(W / 2, H / 2 - 30, 'WAVE 1', NEON.blue);
      addFloatingText(W / 2, H / 2 + 10, 'SURVIVE!', NEON.pink);
    }, 300);

    // Initial enemy spawn
    for (let i = 0; i < 3; i++) {
      setTimeout(() => { if (active) spawnEnemy(); }, i * 500);
    }

    animFrame = requestAnimationFrame(gameLoop);
  }

  function stop() {
    active = false;
    cancelAnimationFrame(animFrame);
    bullets = [];
    enemies = [];
    particles = [];
    powerUps = [];
    floatingTexts = [];

    if (_canvas) {
      _canvas.removeEventListener('pointerdown', onPointerDown);
      _canvas.removeEventListener('pointermove', onPointerMove);
      _canvas.removeEventListener('pointerup', onPointerUp);
      _canvas.removeEventListener('pointercancel', onPointerUp);
    }

    resultOverlay = document.getElementById('game-result');
    if (resultOverlay) resultOverlay.classList.remove('visible');
  }

  function replay(canvas, ctx) {
    stop();
    start(canvas, ctx);
  }

  // Dummy for compatibility with calligraphy app
  function checkHit() {}

  return {
    start,
    stop,
    end: endGame,
    replay,
    checkHit,
    get active() { return active; },
    get score() { return score; },
  };
})();
