// =============================================
// 修仙贪吃蛇 - Cultivation Snake Game (Optimized)
// Pure Canvas 2D + Web Audio API, zero dependencies
//
// Optimizations 2026-04-29:
//   [PERF] OffscreenCanvas background caching (static bg drawn once)
//   [PERF] Uint8Array grid map for O(1) collision detection
//   [PERF] Input queue prevents direction override / self-collision
//   [PERF] dt cap (100ms) prevents tab-switch time explosion
//   [PERF] Audio instance limiter (max 3 concurrent sounds)
//   [VISUAL] Realm-specific snake skins (metallic, translucent, fire)
//   [VISUAL] Screen shake on breakthrough
//   [VISUAL] 仙果 gravity field particles
//   [GAMEPLAY] 大乘期 fruit attraction aura (1-cell auto-collect)
// =============================================

(function() {
'use strict';

// ─── Configuration ─────────────────────────
const CONFIG = {
  GRID_SIZE: 20,
  INITIAL_SPEED: 150,
  MIN_SPEED: 60,
  MAX_SPEED: 200,
  SPEED_STEP: 10,
  PARTICLE_COUNT_FOOD: 12,
  PARTICLE_COUNT_BREAKTHROUGH: 60,
  PARTICLE_COUNT_DEATH: 40,
  STAR_COUNT: 80,
  FOG_COUNT: 15,
  MAX_PARTICLES: 500,
  MAX_AUDIO_INSTANCES: 3,     // cap concurrent sound nodes
  MAX_DT: 100,                // cap delta-time to prevent tab-switch explosion
};

// ─── Realm Definitions ─────────────────────
const REALMS = [
  { name: '炼气期', minLen: 3,  speed: 150, color: '#e0e0e0', glowColor: 'rgba(224,224,224,0.4)', progressName: '灵气' },
  { name: '筑基期', minLen: 10, speed: 130, color: '#4ade80', glowColor: 'rgba(74,222,128,0.4)', progressName: '筑基' },
  { name: '金丹期', minLen: 20, speed: 110, color: '#ffd700', glowColor: 'rgba(255,215,0,0.4)',   progressName: '金丹' },
  { name: '元婴期', minLen: 35, speed: 90,  color: '#a855f7', glowColor: 'rgba(168,85,247,0.4)',  progressName: '元婴' },
  { name: '化神期', minLen: 50, speed: 75,  color: '#ef4444', glowColor: 'rgba(239,68,68,0.4)',   progressName: '化神' },
  { name: '大乘期', minLen: 70, speed: 60,  color: '#ff6b9d', glowColor: 'rgba(255,107,157,0.4)', progressName: '大乘' },
];

// ─── Fruit Types ───────────────────────────
const FRUITS = [
  { name: '普通灵果', color: '#4ade80', glowColor: 'rgba(74,222,128,0.6)', growth: 1, cultivation: 10, weight: 60, pulseSpeed: 0.02 },
  { name: '千年灵果', color: '#60a5fa', glowColor: 'rgba(96,165,250,0.7)', growth: 3, cultivation: 30, weight: 25, pulseSpeed: 0.04 },
  { name: '万年灵果', color: '#c084fc', glowColor: 'rgba(192,132,252,0.8)', growth: 5, cultivation: 50, weight: 10, pulseSpeed: 0.06 },
  { name: '仙果',     color: '#ffd700', glowColor: 'rgba(255,215,0,0.9)',   growth: 10, cultivation: 100, weight: 5, pulseSpeed: 0.08 },
];

const IS_IMMORTAL = FRUITS.length - 1; // index of 仙果

// ─── Canvas & Context ──────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvas-wrapper');

// ─── Offscreen Canvas for Background Cache ─
let bgCanvas = document.createElement('canvas');
let bgCtx = bgCanvas.getContext('2d');
let bgCacheDirty = true; // rebuild cache on next draw

// ─── UI Elements ───────────────────────────
const realmNameEl = document.getElementById('realm-name');
const progressBarEl = document.getElementById('progress-bar');
const lengthDisplayEl = document.getElementById('length-display');
const scoreDisplayEl = document.getElementById('score-display');
const highScoreEl = document.getElementById('high-score');
const overlayScreen = document.getElementById('overlay-screen');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const overlayInfo = document.getElementById('overlay-info');
const overlayButtons = document.getElementById('overlay-buttons');
const btnStart = document.getElementById('btn-start');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const leaderboardPanel = document.getElementById('leaderboard-panel');
const leaderboardList = document.getElementById('leaderboard-list');
const breakthroughOverlay = document.getElementById('breakthrough-overlay');
const breakthroughText = document.getElementById('breakthrough-text');
const breakthroughSub = document.getElementById('breakthrough-sub');

// ─── Game State ────────────────────────────
let game = null;
let animFrame = null;
let lastTime = 0;

function createGameState() {
  const cols = Math.floor((window.innerWidth * 0.92) / CONFIG.GRID_SIZE);
  const rows = Math.floor((window.innerHeight * 0.82) / CONFIG.GRID_SIZE);
  const W = cols * CONFIG.GRID_SIZE;
  const H = rows * CONFIG.GRID_SIZE;
  canvas.width = W;
  canvas.height = H;

  // Rebuild bg cache when dimensions change
  bgCanvas.width = W;
  bgCanvas.height = H;
  bgCacheDirty = true;

  // Grid map for O(1) collision detection
  const gridMap = new Uint8Array(cols * rows);

  return {
    W, H, cols, rows,
    snake: [],
    direction: { x: 1, y: 0 },
    inputQueue: [],           // input buffer: max 2, consumed per tick
    fruits: [],
    particles: [],
    stars: [],
    fogs: [],
    score: 0,
    cultivation: 0,
    speedModifier: 0,
    paused: false,
    running: false,
    gameOver: false,
    realmIndex: 0,
    extraLife: false,
    breakingThrough: false,
    breakthroughTimer: 0,
    deathAnim: false,
    tickAccumulator: 0,
    time: 0,
    bgPulse: 0,
    shakeTimer: 0,            // screen shake
    gridMap,                  // Uint8Array: 1 = snake occupied
  };
}

// ─── Grid Map Helpers (O(1) collision) ────
function gridIdx(x, y) {
  return y * game.cols + x;
}

function markGrid(x, y, val) {
  if (x >= 0 && x < game.cols && y >= 0 && y < game.rows) {
    game.gridMap[gridIdx(x, y)] = val;
  }
}

function rebuildGrid() {
  game.gridMap.fill(0);
  for (const seg of game.snake) {
    markGrid(seg.x, seg.y, 1);
  }
}

// ─── Audio Engine ──────────────────────────
let audioCtx = null;
let ambientGain = null;
let ambientOsc = null;
let activeAudioCount = 0;  // limit concurrent sound instances

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0.03;
    ambientGain.connect(audioCtx.destination);
    ambientOsc = audioCtx.createOscillator();
    ambientOsc.type = 'sine';
    ambientOsc.frequency.value = 80;
    ambientOsc.connect(ambientGain);
    ambientOsc.start();
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 120;
    const g2 = audioCtx.createGain();
    g2.gain.value = 0.015;
    osc2.connect(g2);
    g2.connect(audioCtx.destination);
    osc2.start();
  } catch(e) { /* no audio */ }
}

function playSound(fn) {
  if (!audioCtx || activeAudioCount >= CONFIG.MAX_AUDIO_INSTANCES) return;
  activeAudioCount++;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  fn(osc, gain);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.onended = () => { activeAudioCount--; };
}

function playEatSound(fruit) {
  playSound((osc, gain) => {
    osc.type = 'sine';
    osc.frequency.value = 400 + fruit.cultivation * 3;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.stop(audioCtx.currentTime + 0.2);
  });
}

function playBreakthroughSound() {
  if (!audioCtx) return;
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = audioCtx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

function playDeathSound() {
  playSound((osc, gain) => {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    osc.stop(audioCtx.currentTime + 0.8);
  });
}

function playPauseSound() {
  playSound((osc, gain) => {
    osc.type = 'triangle';
    osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.stop(audioCtx.currentTime + 0.1);
  });
}

// ─── Leaderboard ───────────────────────────
function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem('cultivation_snake_lb') || '[]'); }
  catch { return []; }
}

function saveScore(score, length, realmName) {
  const lb = getLeaderboard();
  lb.push({ score, length, realm: realmName, date: new Date().toLocaleDateString('zh-CN') });
  lb.sort((a, b) => b.score - a.score);
  const top = lb.slice(0, 10);
  localStorage.setItem('cultivation_snake_lb', JSON.stringify(top));
  return top;
}

function getHighScore() {
  const lb = getLeaderboard();
  return lb.length > 0 ? lb[0].score : 0;
}

function renderLeaderboard() {
  const lb = getLeaderboard();
  leaderboardList.innerHTML = '';
  if (lb.length === 0) {
    leaderboardList.innerHTML = '<li style="justify-content:center;color:#888">暂无记录</li>';
    return;
  }
  lb.forEach((entry, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${i+1}. ${entry.realm} (${entry.length}节)</span><span>${entry.score}分</span>`;
    leaderboardList.appendChild(li);
  });
}

// ─── Particles ─────────────────────────────
function spawnParticles(x, y, color, count, spread, speed, life) {
  if (game.particles.length >= CONFIG.MAX_PARTICLES) {
    game.particles.splice(0, count);
  }
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vel = (Math.random() * 0.7 + 0.3) * (speed || 3);
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * vel * (spread || 1),
      vy: Math.sin(angle) * vel * (spread || 1),
      color,
      life: life || 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnAbsorbParticles(headPx, headPy, fruitPx, fruitPy, color) {
  for (let i = 0; i < CONFIG.PARTICLE_COUNT_FOOD; i++) {
    const t = Math.random();
    const sx = fruitPx + (headPx - fruitPx) * t + (Math.random() - 0.5) * 20;
    const sy = fruitPy + (headPy - fruitPy) * t + (Math.random() - 0.5) * 20;
    game.particles.push({
      x: sx, y: sy,
      vx: (headPx - sx) * 0.1,
      vy: (headPy - sy) * 0.1,
      color,
      life: 1,
      decay: 0.025,
      size: 1.5 + Math.random() * 2.5,
      home: true,
      homeX: headPx,
      homeY: headPy,
    });
  }
}

// 仙果 gravity field particles — flow toward the fruit
function spawnGravityParticles(fruitPx, fruitPy, color) {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 20;
    game.particles.push({
      x: fruitPx + Math.cos(angle) * dist,
      y: fruitPy + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * 0.5,
      vy: -Math.sin(angle) * 0.5,
      color,
      life: 1,
      decay: 0.03,
      size: 1 + Math.random() * 1.5,
      home: true,
      homeX: fruitPx,
      homeY: fruitPy,
    });
  }
}

function updateParticles() {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.home) {
      p.vx += (p.homeX - p.x) * 0.05;
      p.vy += (p.homeY - p.y) * 0.05;
      p.vx *= 0.95;
      p.vy *= 0.95;
    }
    p.life -= p.decay;
    if (p.life <= 0) game.particles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.save();
  for (const p of game.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Background Elements ───────────────────
function initStars() {
  game.stars = [];
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    game.stars.push({
      x: Math.random() * game.W,
      y: Math.random() * game.H,
      size: 0.5 + Math.random() * 1.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2,
    });
  }
}

function initFogs() {
  game.fogs = [];
  for (let i = 0; i < CONFIG.FOG_COUNT; i++) {
    game.fogs.push({
      x: Math.random() * game.W,
      y: Math.random() * game.H,
      radius: 30 + Math.random() * 60,
      alpha: 0.02 + Math.random() * 0.03,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
    });
  }
}

// Build the offscreen background cache (static elements)
function buildBackgroundCache() {
  if (!bgCacheDirty) return;
  bgCacheDirty = false;

  const g = bgCtx;
  const { W, H } = game;

  // Base gradient
  const grad = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, '#12121f');
  grad.addColorStop(1, '#08080f');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // Stars
  for (const s of game.stars) {
    const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
    g.globalAlpha = alpha;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // Grid lines
  g.strokeStyle = 'rgba(255,255,255,0.03)';
  g.lineWidth = 0.5;
  for (let x = 0; x <= W; x += CONFIG.GRID_SIZE) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }
  for (let y = 0; y <= H; y += CONFIG.GRID_SIZE) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }

  // Corner decorations
  const s = CONFIG.GRID_SIZE;
  const realm = REALMS[game.realmIndex];
  g.globalAlpha = 0.3;
  g.strokeStyle = realm.color;
  g.lineWidth = 1.5;
  const corners = [
    { x: s, y: s, dx: 1, dy: 1 },
    { x: W - s, y: s, dx: -1, dy: 1 },
    { x: s, y: H - s, dx: 1, dy: -1 },
    { x: W - s, y: H - s, dx: -1, dy: -1 },
  ];
  for (const c of corners) {
    g.beginPath();
    g.moveTo(c.x, c.y + c.dy * s * 1.5);
    g.lineTo(c.x, c.y);
    g.lineTo(c.x + c.dx * s * 1.5, c.y);
    g.stroke();
  }
  g.globalAlpha = 1;
}

// ─── Fruit Logic ───────────────────────────
function pickFruitType() {
  const totalWeight = FRUITS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * totalWeight;
  for (const f of FRUITS) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FRUITS[0];
}

function isOnFruit(x, y) {
  return game.fruits.some(f => f.x === x && f.y === y);
}

function randomEmptyPos() {
  let x, y, tries = 0;
  do {
    x = Math.floor(Math.random() * game.cols);
    y = Math.floor(Math.random() * game.rows);
    tries++;
  } while ((game.gridMap[gridIdx(x, y)] || isOnFruit(x, y)) && tries < 200);
  return { x, y };
}

function spawnFruit() {
  const pos = randomEmptyPos();
  const type = pickFruitType();
  game.fruits.push({ x: pos.x, y: pos.y, type, pulsePhase: Math.random() * Math.PI * 2 });
}

function drawFruits() {
  const gs = CONFIG.GRID_SIZE;
  for (const f of game.fruits) {
    const px = f.x * gs + gs / 2;
    const py = f.y * gs + gs / 2;
    f.pulsePhase += f.type.pulseSpeed;
    const pulse = 0.6 + Math.sin(f.pulsePhase) * 0.4;
    const radius = gs * 0.35 * (0.9 + pulse * 0.1);
    const idx = FRUITS.indexOf(f.type);

    // Glow
    ctx.save();
    ctx.shadowBlur = 15 * pulse;
    ctx.shadowColor = f.type.glowColor;
    ctx.globalAlpha = 0.4 + pulse * 0.3;
    ctx.fillStyle = f.type.color;
    ctx.beginPath();
    ctx.arc(px, py, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.save();
    ctx.fillStyle = f.type.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = f.type.color;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner highlight
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - radius * 0.25, py - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 仙果: gravity field particles
    if (idx === IS_IMMORTAL) {
      spawnGravityParticles(px, py, f.type.color);
      // Extra outer ring glow
      ctx.save();
      ctx.globalAlpha = 0.15 + pulse * 0.1;
      ctx.strokeStyle = f.type.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(px, py, radius * 2.5 + Math.sin(game.time * 0.08) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

// ─── Snake Logic ───────────────────────────
function initSnake() {
  const startX = Math.floor(game.cols / 2);
  const startY = Math.floor(game.rows / 2);
  game.snake = [];
  for (let i = 2; i >= 0; i--) {
    game.snake.push({ x: startX - i, y: startY });
  }
  game.direction = { x: 1, y: 0 };
  game.inputQueue = [];
  rebuildGrid();
}

function getCurrentRealm() {
  let idx = 0;
  for (let i = REALMS.length - 1; i >= 0; i--) {
    if (game.snake.length >= REALMS[i].minLen) { idx = i; break; }
  }
  return idx;
}

function tick() {
  if (game.paused || game.gameOver || game.breakingThrough) return;

  // ── Process input queue ──
  if (game.inputQueue.length > 0) {
    const next = game.inputQueue.shift();
    if (next.x !== -game.direction.x || next.y !== -game.direction.y) {
      game.direction = next;
    }
  }

  const head = game.snake[game.snake.length - 1];
  const newHead = {
    x: head.x + game.direction.x,
    y: head.y + game.direction.y,
  };

  // ── Wall collision ──
  if (newHead.x < 0 || newHead.x >= game.cols || newHead.y < 0 || newHead.y >= game.rows) {
    if (game.extraLife) {
      game.extraLife = false;
      const bounceDir = { x: -game.direction.x, y: -game.direction.y };
      newHead.x = head.x + bounceDir.x;
      newHead.y = head.y + bounceDir.y;
      game.direction = { ...bounceDir };
      spawnParticles(newHead.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2, newHead.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2, '#ff6b6b', 15, 1, 2, 0.8);
      if (game.gridMap[gridIdx(newHead.x, newHead.y)]) {
        triggerDeath();
        return;
      }
    } else {
      triggerDeath();
      return;
    }
  }

  // ── Self collision (O(1) grid lookup) ──
  if (game.gridMap[gridIdx(newHead.x, newHead.y)]) {
    if (game.extraLife) {
      game.extraLife = false;
      const bounceDir = { x: -game.direction.x, y: -game.direction.y };
      newHead.x = head.x + bounceDir.x;
      newHead.y = head.y + bounceDir.y;
      game.direction = { ...bounceDir };
      spawnParticles(newHead.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2, newHead.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE/2, '#ff6b6b', 15, 1, 2, 0.8);
      if (game.gridMap[gridIdx(newHead.x, newHead.y)]) {
        triggerDeath();
        return;
      }
    } else {
      triggerDeath();
      return;
    }
  }

  game.snake.push(newHead);
  markGrid(newHead.x, newHead.y, 1);

  // ── Check fruit eating ──
  for (let i = game.fruits.length - 1; i >= 0; i--) {
    const f = game.fruits[i];
    if (f.x === newHead.x && f.y === newHead.y) {
      const growth = f.type.growth - 1;
      for (let g = 0; g < growth; g++) {
        game.snake.unshift({ ...game.snake[0] });
      }

      game.score += f.type.cultivation;
      game.cultivation += f.type.cultivation;

      const headPx = newHead.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
      const headPy = newHead.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
      const fruitPx = f.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
      const fruitPy = f.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
      spawnAbsorbParticles(headPx, headPy, fruitPx, fruitPy, f.type.color);

      playEatSound(f.type);

      game.fruits.splice(i, 1);
      checkBreakthrough();
      break;
    }
  }

  // ── Fruit management ──
  if (game.fruits.length === 0) spawnFruit();
  const maxFruits = Math.min(4, 1 + Math.floor(game.snake.length / 15));
  if (game.fruits.length < maxFruits && Math.random() < 0.25) spawnFruit();

  // ── 大乘期: fruit attraction aura ──
  if (game.realmIndex >= 5 && game.fruits.length > 0) {
    for (const f of game.fruits) {
      const dx = Math.abs(f.x - newHead.x);
      const dy = Math.abs(f.y - newHead.y);
      if (dx <= 1 && dy <= 1 && (dx + dy) > 0) {
        // Auto-collect: pull fruit to head position
        const headPx = newHead.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        const headPy = newHead.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        const fruitPx = f.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        const fruitPy = f.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        spawnAbsorbParticles(headPx, headPy, fruitPx, fruitPy, f.type.color);
        playEatSound(f.type);

        game.score += f.type.cultivation;
        game.cultivation += f.type.cultivation;

        // Mark old fruit position as empty, new head already marked above
        game.fruits.splice(game.fruits.indexOf(f), 1);
        checkBreakthrough();
        break;
      }
    }
  }
}

function checkBreakthrough() {
  const newRealmIdx = getCurrentRealm();
  if (newRealmIdx > game.realmIndex) {
    game.realmIndex = newRealmIdx;
    game.extraLife = true;
    game.breakingThrough = true;
    game.breakthroughTimer = 0;

    // Mark bg cache dirty for realm color change
    bgCacheDirty = true;

    const realm = REALMS[game.realmIndex];
    const head = game.snake[game.snake.length - 1];
    const px = head.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
    const py = head.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;

    spawnParticles(px, py, realm.color, CONFIG.PARTICLE_COUNT_BREAKTHROUGH, 2, 5, 1.2);
    spawnParticles(px, py, '#fff', 20, 1, 3, 0.8);

    playBreakthroughSound();

    breakthroughText.textContent = realm.name;
    breakthroughText.style.color = realm.color;
    breakthroughSub.textContent = '获得一次保命机会！';
    breakthroughOverlay.classList.add('active');

    setTimeout(() => {
      game.breakingThrough = false;
      breakthroughOverlay.classList.remove('active');
    }, 2000);

    game.bgPulse = 1;
    game.shakeTimer = 1.0; // screen shake
  }
}

function triggerDeath() {
  game.gameOver = true;
  game.running = false;

  const gs = CONFIG.GRID_SIZE;
  for (const seg of game.snake) {
    const realm = REALMS[game.realmIndex];
    spawnParticles(seg.x * gs + gs/2, seg.y * gs + gs/2, realm.color, 3, 1.5, 4, 1);
  }

  playDeathSound();

  const realm = REALMS[game.realmIndex];
  saveScore(game.score, game.snake.length, realm.name);

  setTimeout(() => {
    game.deathAnim = false;
    showGameOver();
  }, 1500);
}

// ─── Snake Rendering (realm-specific skins) ─
function drawSnake() {
  const gs = CONFIG.GRID_SIZE;
  const realm = REALMS[game.realmIndex];
  const len = game.snake.length;
  if (len === 0) return;

  const rr = parseInt(realm.color.slice(1,3), 16);
  const rg = parseInt(realm.color.slice(3,5), 16);
  const rb = parseInt(realm.color.slice(5,7), 16);

  // ── Connectors ──
  ctx.save();
  for (let i = 0; i < len - 1; i++) {
    const seg = game.snake[i];
    const next = game.snake[i + 1];
    const t = (i + 0.5) / len;
    const alpha = 0.3 + t * 0.3;
    const lineWidth = gs * 0.35 * (0.6 + t * 0.3);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgb(${rr},${rg},${rb})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(seg.x * gs + gs / 2, seg.y * gs + gs / 2);
    ctx.lineTo(next.x * gs + gs / 2, next.y * gs + gs / 2);
    ctx.stroke();
  }
  ctx.restore();

  // ── Body segments ──
  drawSnakeBody(rr, rg, rb, len, realm);

  // ── Head details ──
  drawSnakeHead(len, realm);
}

// Realm-specific body rendering
function drawSnakeBody(rr, rg, rb, len, realm) {
  const gs = CONFIG.GRID_SIZE;
  const realmIdx = game.realmIndex;

  ctx.save();

  for (let i = 0; i < len; i++) {
    const seg = game.snake[i];
    const px = seg.x * gs + gs / 2;
    const py = seg.y * gs + gs / 2;
    const t = i / len;
    const size = gs * 0.4 * (0.6 + t * 0.4);
    const wave = Math.sin(game.time * 0.05 + i * 0.3) * 0.8;
    const halfSize = size;
    const rx = px - halfSize + (t < 1 ? wave : 0);
    const ry = py - halfSize;
    const rw = halfSize * 2;
    const rh = halfSize * 2;
    const radius = halfSize * 0.4;

    ctx.shadowBlur = 6 + t * 6;
    ctx.shadowColor = realm.glowColor;

    if (realmIdx >= 4) {
      // 化神期 / 大乘期: fire aura — bright core with glow halo
      const alpha = 0.6 + t * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${rr},${rg},${rb})`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, radius);
      else { ctx.moveTo(rx + radius, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius); ctx.arcTo(rx, ry + rh, rx, ry, radius); ctx.arcTo(rx, ry, rx + rw, ry, radius); }
      ctx.fill();

      // Fire halo
      if (t > 0.5) {
        ctx.globalAlpha = 0.15 + Math.sin(game.time * 0.1 + i) * 0.1;
        ctx.fillStyle = realm.color;
        ctx.beginPath();
        ctx.arc(px, py, size * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (realmIdx === 3) {
      // 元婴期: translucent with inner spirit root lines
      const alpha = 0.45 + t * 0.45;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${rr},${rg},${rb})`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, radius);
      else { ctx.moveTo(rx + radius, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius); ctx.arcTo(rx, ry + rh, rx, ry, radius); ctx.arcTo(rx, ry, rx + rw, ry, radius); }
      ctx.fill();

      // Spirit root lines (inner glow)
      if (t > 0.2) {
        ctx.globalAlpha = 0.3 + t * 0.3;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.moveTo(px - size * 0.3, py);
        ctx.lineTo(px + size * 0.3, py);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px, py - size * 0.3);
        ctx.lineTo(px, py + size * 0.3);
        ctx.stroke();
      }
    } else if (realmIdx === 2) {
      // 金丹期: metallic flow — shifting gradient across body
      const alpha = 0.6 + t * 0.4;
      ctx.globalAlpha = alpha;

      // Metallic gradient per segment
      const flowPhase = (game.time * 0.03 + i * 0.15) % 1;
      const gr = rr + Math.floor((255 - rr) * flowPhase * 0.3);
      const gg = rg + Math.floor((200 - rg) * flowPhase * 0.3);
      const gb = rb + Math.floor((100 - rb) * flowPhase * 0.3);
      ctx.fillStyle = `rgb(${Math.min(255, gr)},${Math.min(255, gg)},${Math.min(255, gb)})`;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, radius);
      else { ctx.moveTo(rx + radius, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius); ctx.arcTo(rx, ry + rh, rx, ry, radius); ctx.arcTo(rx, ry, rx + rw, ry, radius); }
      ctx.fill();

      // Specular highlight
      ctx.globalAlpha = 0.25 + Math.sin(game.time * 0.05 + i * 0.4) * 0.15;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px - size * 0.2, py - size * 0.2, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 炼气期 / 筑基期: standard solid color
      const alpha = 0.5 + t * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${rr},${rg},${rb})`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, radius);
      else { ctx.moveTo(rx + radius, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius); ctx.arcTo(rx, ry + rh, rx, ry, radius); ctx.arcTo(rx, ry, rx + rw, ry, radius); }
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawSnakeHead(len, realm) {
  const gs = CONFIG.GRID_SIZE;
  const head = game.snake[len - 1];
  const hpx = head.x * gs + gs / 2;
  const hpy = head.y * gs + gs / 2;
  const dir = game.direction;
  const headSize = gs * 0.45;
  const realmIdx = game.realmIndex;

  // Crown / horn for higher realms
  if (realmIdx >= 2) {
    ctx.save();
    ctx.strokeStyle = realm.color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = realm.glowColor;
    ctx.beginPath();
    ctx.moveTo(hpx - 4, hpy - headSize - 2);
    ctx.lineTo(hpx, hpy - headSize - 7);
    ctx.lineTo(hpx + 4, hpy - headSize - 2);
    ctx.stroke();
    ctx.restore();
  }

  // 大乘期: aura ring around head
  if (realmIdx >= 5) {
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(game.time * 0.1) * 0.1;
    ctx.strokeStyle = realm.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = realm.glowColor;
    ctx.beginPath();
    ctx.arc(hpx, hpy, headSize * 1.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Eyes
  const eyeOffset = 3;
  const perpX = -dir.y;
  const perpY = dir.x;
  const eye1x = hpx + dir.x * 2 + perpX * eyeOffset;
  const eye1y = hpy + dir.y * 2 + perpY * eyeOffset;
  const eye2x = hpx + dir.x * 2 - perpX * eyeOffset;
  const eye2y = hpy + dir.y * 2 - perpY * eyeOffset;

  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 4;
  ctx.shadowColor = '#fff';
  ctx.beginPath();
  ctx.arc(eye1x, eye1y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eye2x, eye2y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(eye1x + dir.x, eye1y + dir.y, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eye2x + dir.x, eye2y + dir.y, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Drawing ───────────────────────────────
function draw() {
  // Screen shake
  ctx.save();
  if (game.shakeTimer > 0) {
    const dx = (Math.random() - 0.5) * 10 * game.shakeTimer;
    const dy = (Math.random() - 0.5) * 10 * game.shakeTimer;
    ctx.translate(dx, dy);
    game.shakeTimer *= 0.9;
    if (game.shakeTimer < 0.1) game.shakeTimer = 0;
  }

  // Background: draw cached bg canvas
  buildBackgroundCache();
  ctx.drawImage(bgCanvas, 0, 0);

  // Animated overlays on top of cached bg
  drawFogOverlay();
  drawBorderGlow();

  if (game.running || game.gameOver) {
    drawFruits();
    if (!game.deathAnim) drawSnake();
    drawParticles();
  }

  // Background pulse
  if (game.bgPulse > 0) {
    ctx.save();
    ctx.globalAlpha = game.bgPulse * 0.2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, game.W, game.H);
    ctx.globalAlpha = game.bgPulse * 0.1;
    const realm = REALMS[game.realmIndex];
    ctx.fillStyle = realm.color;
    ctx.fillRect(0, 0, game.W, game.H);
    ctx.restore();
    game.bgPulse *= 0.90;
    if (game.bgPulse < 0.01) game.bgPulse = 0;
  }

  // Paused overlay
  if (game.paused && !game.gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,15,0.7)';
    ctx.fillRect(0, 0, game.W, game.H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.fillText('⏸ 暂停', game.W / 2, game.H / 2);
    ctx.font = '16px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('按空格继续', game.W / 2, game.H / 2 + 30);
    ctx.restore();
  }

  ctx.restore(); // restore from screen shake
}

function drawFogOverlay() {
  for (const f of game.fogs) {
    f.x += f.vx;
    f.y += f.vy;
    if (f.x < -f.radius) f.x = game.W + f.radius;
    if (f.x > game.W + f.radius) f.x = -f.radius;
    if (f.y < -f.radius) f.y = game.H + f.radius;
    if (f.y > game.H + f.radius) f.y = -f.radius;

    const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
    fg.addColorStop(0, `rgba(100,140,255,${f.alpha})`);
    fg.addColorStop(1, 'rgba(100,140,255,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(f.x - f.radius, f.y - f.radius, f.radius * 2, f.radius * 2);
  }
}

function drawBorderGlow() {
  const realm = REALMS[game.realmIndex];
  const borderGlow = 0.3 + Math.sin(game.time * 0.03) * 0.15;

  // Normal border
  ctx.save();
  ctx.strokeStyle = realm.color;
  ctx.globalAlpha = borderGlow;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 15;
  ctx.shadowColor = realm.glowColor;
  ctx.strokeRect(1, 1, game.W - 2, game.H - 2);
  ctx.restore();

  // Wall proximity warning
  if (game.running && game.snake.length > 0) {
    const head = game.snake[game.snake.length - 1];
    const warningDist = 2;
    const nearWall = head.x < warningDist || head.x >= game.cols - warningDist ||
                     head.y < warningDist || head.y >= game.rows - warningDist;
    if (nearWall) {
      ctx.save();
      ctx.strokeStyle = '#ff4444';
      ctx.globalAlpha = 0.15 + Math.sin(game.time * 0.1) * 0.1;
      ctx.lineWidth = 6;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0000';
      ctx.strokeRect(1, 1, game.W - 2, game.H - 2);
      ctx.restore();
    }
  }
}

// ─── UI Update ─────────────────────────────
function updateUI() {
  const realm = REALMS[game.realmIndex];
  realmNameEl.textContent = realm.name;
  realmNameEl.style.color = realm.color;
  realmNameEl.style.textShadow = `0 0 10px ${realm.color}`;

  const nextIdx = game.realmIndex + 1;
  if (nextIdx < REALMS.length) {
    const currentMin = realm.minLen;
    const nextMin = REALMS[nextIdx].minLen;
    const progress = Math.min(1, (game.snake.length - currentMin) / (nextMin - currentMin));
    progressBarEl.style.width = (progress * 100) + '%';
    progressBarEl.style.background = `linear-gradient(90deg, ${realm.color}, ${REALMS[nextIdx].color})`;
  } else {
    progressBarEl.style.width = '100%';
    progressBarEl.style.background = realm.color;
  }

  lengthDisplayEl.textContent = `灵脉: ${game.snake.length}`;
  scoreDisplayEl.textContent = `得分: ${game.score}`;
  highScoreEl.textContent = `最高: ${getHighScore()}`;
}

// ─── Game Over Screen ──────────────────────
function showGameOver() {
  game.running = false;
  const realm = REALMS[game.realmIndex];
  const hs = getHighScore();
  const isNewRecord = game.score >= hs;

  overlayTitle.textContent = '走火入魔';
  overlayTitle.style.color = '#ef4444';
  overlaySubtitle.textContent = '修为散尽，重新开始';
  overlayInfo.innerHTML = `
    <div>最终境界: <span class="highlight" style="color:${realm.color}">${realm.name}</span></div>
    <div>灵脉长度: <span class="highlight">${game.snake.length} 节</span></div>
    <div>总得分: <span class="highlight">${game.score} 分</span></div>
    ${isNewRecord ? '<div class="record">🎉 打破记录！🎉</div>' : ''}
    ${game.extraLife ? '<div>保命机会剩余: 1</div>' : ''}
  `;
  overlayButtons.innerHTML = `
    <button class="btn" id="btn-restart">重新修炼</button>
    <button class="btn btn-secondary" id="btn-lb2">排行榜</button>
  `;
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-lb2').addEventListener('click', () => {
    renderLeaderboard();
    leaderboardPanel.style.display = 'block';
  });
  leaderboardPanel.style.display = 'none';
  overlayScreen.classList.remove('hidden');
}

// ─── Main Menu ─────────────────────────────
function showMainMenu() {
  overlayTitle.textContent = '修仙贪吃蛇';
  overlayTitle.style.color = '#fff';
  overlayTitle.style.textShadow = '0 0 20px #a855f7, 0 0 40px #4a9eff';
  overlaySubtitle.textContent = '吞噬灵果，突破境界，问道长生';
  overlayInfo.innerHTML = `
    <div>历史最高: <span class="highlight">${getHighScore()} 分</span></div>
  `;
  overlayButtons.innerHTML = `
    <button class="btn" id="btn-start2">开始修炼</button>
    <button class="btn btn-secondary" id="btn-lb3">排行榜</button>
  `;
  document.getElementById('btn-start2').addEventListener('click', startGame);
  document.getElementById('btn-lb3').addEventListener('click', () => {
    renderLeaderboard();
    leaderboardPanel.style.display = 'block';
  });
  leaderboardPanel.style.display = 'none';
  overlayScreen.classList.remove('hidden');
}

// ─── Game Start ────────────────────────────
function startGame() {
  initAudio();
  game = createGameState();
  initSnake();
  initStars();
  initFogs();
  game.fruits = [];
  game.particles = [];
  game.score = 0;
  game.cultivation = 0;
  game.realmIndex = 0;
  game.paused = false;
  game.gameOver = false;
  game.running = true;
  game.breakingThrough = false;
  game.deathAnim = false;
  game.tickAccumulator = 0;
  game.time = 0;
  game.extraLife = false;
  game.shakeTimer = 0;
  game.inputQueue = [];

  spawnFruit();
  spawnFruit();

  overlayScreen.classList.add('hidden');
  updateUI();
}

// ─── Input Handling ────────────────────────
const KEY_MAP = {
  'ArrowUp':    { x:  0, y: -1 },
  'ArrowDown':  { x:  0, y:  1 },
  'ArrowLeft':  { x: -1, y:  0 },
  'ArrowRight': { x:  1, y:  0 },
  'w': { x:  0, y: -1 },
  's': { x:  0, y:  1 },
  'a': { x: -1, y:  0 },
  'd': { x:  1, y:  0 },
  'W': { x:  0, y: -1 },
  'S': { x:  0, y:  1 },
  'A': { x: -1, y:  0 },
  'D': { x:  1, y:  0 },
};

document.addEventListener('keydown', (e) => {
  if (!game || !game.running) return;

  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    if (!game.gameOver) {
      game.paused = !game.paused;
      playPauseSound();
      updateUI();
    }
    return;
  }

  if (e.key === '=' || e.key === '+') {
    game.speedModifier = Math.max(-CONFIG.SPEED_STEP * 5, game.speedModifier - CONFIG.SPEED_STEP);
    e.preventDefault();
    return;
  }

  if (e.key === '-' || e.key === '_') {
    game.speedModifier = Math.min(0, game.speedModifier + CONFIG.SPEED_STEP);
    e.preventDefault();
    return;
  }

  const dir = KEY_MAP[e.key];
  if (dir) {
    e.preventDefault();
    // Input queue: buffer up to 2 directions, consumed one per tick
    if (game.inputQueue.length < 2) {
      game.inputQueue.push({ ...dir });
    }
  }
});

// Mobile touch controls
function bindDpadBtn(id, dir) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    initAudio();
    if (!game || !game.running) return;
    if (game.inputQueue.length < 2) game.inputQueue.push({ ...dir });
  });
}
bindDpadBtn('btn-up', { x: 0, y: -1 });
bindDpadBtn('btn-down', { x: 0, y: 1 });
bindDpadBtn('btn-left', { x: -1, y: 0 });
bindDpadBtn('btn-right', { x: 1, y: 0 });

// ─── Game Loop ─────────────────────────────
function getSpeed() {
  const realm = REALMS[game.realmIndex];
  return Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, realm.speed + game.speedModifier));
}

function gameLoop(timestamp) {
  animFrame = requestAnimationFrame(gameLoop);

  if (!lastTime) lastTime = timestamp;
  let dt = timestamp - lastTime;
  lastTime = timestamp;

  // Cap dt to prevent tab-switch explosion
  if (dt > CONFIG.MAX_DT) dt = CONFIG.MAX_DT;

  if (game && game.running && !game.paused && !game.gameOver && !game.breakingThrough) {
    game.tickAccumulator += dt;
    const speed = getSpeed();
    while (game.tickAccumulator >= speed) {
      tick();
      game.tickAccumulator -= speed;
      if (game.gameOver) break;
    }
  }

  if (game) {
    // Update star twinkle in the cached bg
    for (const s of game.stars) {
      s.twinkle += s.speed * 0.02;
    }
    // Mark bg cache dirty when stars animate (they change per-frame)
    bgCacheDirty = true;

    game.time++;
    updateParticles();
    draw();
    updateUI();
  }
}

// ─── Responsive Resize ─────────────────────
window.addEventListener('resize', () => {
  if (game && game.running) {
    const savedSnake = game.snake;
    const savedFruits = game.fruits;
    const savedScore = game.score;
    const savedRealmIndex = game.realmIndex;
    const savedCultivation = game.cultivation;
    const savedSpeedMod = game.speedModifier;
    const savedDir = game.direction;
    const savedExtraLife = game.extraLife;
    const savedTime = game.time;
    const savedInputQueue = game.inputQueue;

    game = createGameState();
    bgCacheDirty = true;
    game.snake = savedSnake.map(s => {
      const nx = Math.min(s.x, game.cols - 1);
      const ny = Math.min(s.y, game.rows - 1);
      return { x: Math.max(0, nx), y: Math.max(0, ny) };
    });
    game.fruits = savedFruits.map(f => ({
      ...f,
      x: Math.min(f.x, game.cols - 1),
      y: Math.min(f.y, game.rows - 1),
    }));
    game.score = savedScore;
    game.realmIndex = savedRealmIndex;
    game.cultivation = savedCultivation;
    game.speedModifier = savedSpeedMod;
    game.direction = savedDir;
    game.extraLife = savedExtraLife;
    game.time = savedTime;
    game.inputQueue = savedInputQueue;
    game.running = true;
    rebuildGrid();
  }
});

// ─── Init ──────────────────────────────────
function init() {
  game = createGameState();
  initStars();
  initFogs();
  game.running = false;

  showMainMenu();
  updateUI();

  animFrame = requestAnimationFrame(gameLoop);
}

init();

})();
