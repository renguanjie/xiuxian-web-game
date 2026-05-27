// ========== 修仙塔防 - Game Engine (重构版) ==========

// ======================== 常量 ========================
const CANVAS_W = 900;
const CANVAS_H = 600;
const GRID = 40;
const COLS = Math.floor(CANVAS_W / GRID);
const ROWS = Math.floor((CANVAS_H - 48 - 72) / GRID);
const PLAY_TOP = 48;
const PLAY_BOTTOM = CANVAS_H - 72;
const MAX_HP = 20;
const PREP_TIME = 10;

// dt-based timing 常量 (秒)
const SPAWN_INTERVAL = 0.5;
const BOSS_WARN_DURATION = 1.5;
const PROJECTILE_MAX_LIFE = 2.0;
const FIRE_ZONE_TICK_INTERVAL = 8 / 60;
const FREEZE_DURATION = 40 / 60;
const LIGHTNING_EFFECT_LIFE = 12 / 60;
const SLASH_EFFECT_LIFE = 8 / 60;
const ICE_EFFECT_LIFE = 15 / 60;
const DEATH_PARTICLE_LIFE = 30 / 60;
const UPGRADE_PARTICLE_LIFE = 40 / 60;
const FIRE_PARTICLE_LIFE = 25 / 60;
const BG_PARTICLE_LIFE_RANGE = [100 / 60, 300 / 60];
const DAMAGING_NUMBER_LIFE = 1.0;
const DAMAGING_NUMBER_VY = -40;

// ======================== 塔定义 ========================
const TOWER_DEFS = {
  sword: {
    name: '剑塔', cost: 20, damage: 18, range: 120, fireRate: 1.0, color: '#ffdd44',
    upgCosts: [15, 25, 40],
    dmgMult: [1, 1.6, 2.4], rateMult: [1, 1.3, 1.7], rangeMult: [1, 1.1, 1.25],
    special: '穿透'
  },
  thunder: {
    name: '雷塔', cost: 30, damage: 12, range: 140, fireRate: 0.6, color: '#8888ff',
    upgCosts: [20, 35, 55],
    dmgMult: [1, 1.5, 2.2], rateMult: [1, 1.2, 1.5], rangeMult: [1, 1.15, 1.35],
    special: '闪电链'
  },
  fire: {
    name: '火塔', cost: 25, damage: 8, range: 110, fireRate: 0.7, color: '#ff6633',
    upgCosts: [18, 30, 48],
    dmgMult: [1, 1.5, 2.3], rateMult: [1, 1.2, 1.5], rangeMult: [1, 1.1, 1.2],
    special: '火焰区域'
  },
  ice: {
    name: '冰塔', cost: 20, damage: 6, range: 130, fireRate: 0.8, color: '#66ddff',
    upgCosts: [15, 25, 40],
    dmgMult: [1, 1.5, 2.0], rateMult: [1, 1.2, 1.5], rangeMult: [1, 1.15, 1.35],
    special: '减速/冻结'
  }
};

// ======================== 敌人类型 ========================
const ENEMY_TYPES = {
  minion: { name: '小妖', hp: 30, speed: 2.2, reward: 8, color: '#ff4444', radius: 10 },
  beast:  { name: '妖兽', hp: 60, speed: 1.6, reward: 14, color: '#ff9933', radius: 13 },
  elite:  { name: '精英', hp: 150, speed: 1.0, reward: 28, color: '#cc66ff', radius: 16 },
  boss:   { name: 'BOSS', hp: 600, speed: 0.7, reward: 80, color: '#ffcc00', radius: 22 }
};

// ======================== 20 关关卡设计 ========================
const LEVELS = [];
(function buildLevels() {
  for (let i = 1; i <= 20; i++) {
    const waves = Math.min(10, Math.floor(3 + (i - 1) * (7 / 19)));
    const initialGold = Math.max(50, Math.round(120 - (i - 1) * 3.7));
    const hasBoss = (i % 5 === 0);
    const hpMult = 1 + (i - 1) * 0.2;
    const speedMult = 1 + (i - 1) * 0.03;
    const enemyTypes = ['minion'];
    if (i >= 3) enemyTypes.push('beast');
    if (i >= 7) enemyTypes.push('elite');
    if (hasBoss) enemyTypes.push('boss');
    const baseCount = 3 + Math.floor(i * 0.6);

    LEVELS.push({
      num: i, waves, initialGold, hpMult, speedMult, hasBoss, enemyTypes, baseCount,
      reward: Math.round(20 + i * 5)
    });
  }
})();

// ======================== 对象池 ========================
class ObjectPool {
  constructor(factory, initialSize) {
    this._factory = factory;
    this._pool = [];
    this._active = [];
    for (let i = 0; i < initialSize; i++) this._pool.push(factory());
  }
  acquire() {
    let obj = this._pool.length > 0 ? this._pool.pop() : this._factory();
    this._active.push(obj);
    return obj;
  }
  release(obj) {
    const idx = this._active.indexOf(obj);
    if (idx !== -1) {
      this._active[idx] = this._active[this._active.length - 1];
      this._active.pop();
      this._pool.push(obj);
    }
  }
  releaseAll() {
    while (this._active.length) this._pool.push(this._active.pop());
  }
  get active() { return this._active; }
}

// ======================== 空间哈希 ========================
class SpatialHash {
  constructor(cellSize) { this.cellSize = cellSize; this.cells = new Map(); }
  clear() { this.cells.clear(); }
  _key(cx, cy) { return cx * 10000 + cy; }
  insert(entity) {
    const cx = Math.floor(entity.px / this.cellSize);
    const cy = Math.floor(entity.py / this.cellSize);
    const key = this._key(cx, cy);
    let bucket = this.cells.get(key);
    if (!bucket) { bucket = []; this.cells.set(key, bucket); }
    bucket.push(entity);
  }
  query(x, y, radius) {
    const results = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.cells.get(this._key(cx, cy));
        if (bucket) for (const e of bucket) results.push(e);
      }
    }
    return results;
  }
}

// ======================== 实体工厂 ========================
function createEnemyObject() {
  return { type: '', hp: 0, maxHp: 0, speed: 0, baseSpeed: 0, reward: 0,
    color: '', radius: 0, dist: 0, alive: false, slowTimer: 0, slowFactor: 1,
    frozen: false, freezeTimer: 0, px: 0, py: 0 };
}

function createProjectileObject() {
  return { x: 0, y: 0, vx: 0, vy: 0, damage: 0, towerType: '', towerLevel: 0,
    target: null, alive: false, life: 0 };
}

function createEffectObject() {
  return { type: '', x: 0, y: 0, segments: null, life: 0, maxLife: 0 };
}

function createParticleObject() {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '', size: 0 };
}

function createDamageNumberObject() {
  return { x: 0, y: 0, text: '', life: 0, maxLife: 0, vy: 0 };
}

// ======================== 路径系统 ========================
function buildPath() {
  const pts = [];
  const waypoints = [
    { x: -10, y: PLAY_TOP + 5 * GRID },
    { x: 3 * GRID, y: PLAY_TOP + 5 * GRID },
    { x: 4.5 * GRID, y: PLAY_TOP + 2 * GRID },
    { x: 7 * GRID, y: PLAY_TOP + 2 * GRID },
    { x: 8.5 * GRID, y: PLAY_TOP + 7 * GRID },
    { x: 11 * GRID, y: PLAY_TOP + 7 * GRID },
    { x: 12.5 * GRID, y: PLAY_TOP + 3 * GRID },
    { x: 15 * GRID, y: PLAY_TOP + 3 * GRID },
    { x: 16.5 * GRID, y: PLAY_TOP + 8 * GRID },
    { x: 19 * GRID, y: PLAY_TOP + 8 * GRID },
    { x: 20.5 * GRID, y: PLAY_TOP + 5 * GRID },
    { x: CANVAS_W + 10, y: PLAY_TOP + 5 * GRID }
  ];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p0 = waypoints[Math.max(0, i - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.02) {
      const t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      pts.push({ x, y });
    }
  }
  pts.push({ x: waypoints[waypoints.length - 1].x, y: waypoints[waypoints.length - 1].y });
  return pts;
}

function getPathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

let pathCumDist = [];

function buildPathCumDist(pts) {
  pathCumDist = new Float64Array(pts.length);
  pathCumDist[0] = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    pathCumDist[i] = pathCumDist[i - 1] + Math.sqrt(dx * dx + dy * dy);
  }
}

function getPositionOnPath(pts, distance) {
  let lo = 0, hi = pts.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (pathCumDist[mid] <= distance) lo = mid;
    else hi = mid;
  }
  const segLen = pathCumDist[hi] - pathCumDist[lo];
  if (segLen < 0.001) return { x: pts[lo].x, y: pts[lo].y };
  const t = (distance - pathCumDist[lo]) / segLen;
  return {
    x: pts[lo].x + (pts[hi].x - pts[lo].x) * t,
    y: pts[lo].y + (pts[hi].y - pts[lo].y) * t
  };
}

let pathGrid = null;

function buildPathMask(pts) {
  pathGrid = new Uint8Array(COLS * ROWS);
  for (const pt of pts) {
    const col = Math.floor(pt.x / GRID);
    const row = Math.floor((pt.y - PLAY_TOP) / GRID);
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = col + dc, r = row + dr;
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
          pathGrid[r * COLS + c] = 1;
        }
      }
    }
  }
}

function isPathCell(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  return pathGrid[row * COLS + col] === 1;
}

// ======================== 音频系统 ========================
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    switch (type) {
      case 'place':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.exponentialRampToValueAtTime(784, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
        break;
      case 'shoot':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now); osc.stop(now + 0.06);
        break;
      case 'kill':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
        break;
      case 'upgrade':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.08);
        osc.frequency.setValueAtTime(659, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
        break;
      case 'wave':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.3);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
        break;
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
        break;
      case 'sell':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
        break;
      case 'boss':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.setValueAtTime(120, now + 0.2);
        osc.frequency.setValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
        break;
      case 'lose':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 1.0);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.start(now); osc.stop(now + 1.0);
        break;
      case 'win':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.15);
        osc.frequency.setValueAtTime(784, now + 0.3);
        osc.frequency.setValueAtTime(1047, now + 0.45);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now); osc.stop(now + 0.7);
        break;
    }
  } catch (e) { /* 静默处理 */ }
}

// ======================== Canvas 设置 ========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// ======================== 游戏状态 ========================
let gameState = 'menu';
let gameMode = 'level';
let gold = 100;
let hp = MAX_HP;
let currentWave = 0;
let totalWaves = 20;
let currentLevel = 1;
let prepTimer = 0;
let selectedTowerType = null;
let selectedPlacedTower = null;
let towers = [];
let pathPts = [];
let pathLength = 0;

// 实体池
const enemyPool = new ObjectPool(createEnemyObject, 50);
const projectilePool = new ObjectPool(createProjectileObject, 200);
const effectPool = new ObjectPool(createEffectObject, 50);
const particlePool = new ObjectPool(createParticleObject, 100);
const damageNumberPool = new ObjectPool(createDamageNumberObject, 80);

// fireZones 较少，用普通数组
let fireZones = [];

// 波次 & 生成
let waveQueue = [];
let spawnTimer = 0;
let bossWarnTimer = 0;

// 背景粒子
let bgParticles = [];

// 计时 & 速度控制
let elapsedTime = 0;
let gameSpeed = 1;

// 离屏背景缓存
let bgCanvas = null;

// 空间哈希 (每帧重建)
const spatialHash = new SpatialHash(40);

// localStorage
let endlessHighWave = 0;
let levelProgress = {};
try {
  endlessHighWave = parseInt(localStorage.getItem('ctd_endless_high') || '0');
  levelProgress = JSON.parse(localStorage.getItem('ctd_level_progress') || '{}');
} catch (e) {
  console.warn('[TD] localStorage not available:', e.message);
}

// ======================== 路径初始化 ========================
function initPath() {
  pathPts = buildPath();
  pathLength = getPathLength(pathPts);
  buildPathCumDist(pathPts);
  buildPathMask(pathPts);
}

// ======================== 离屏背景构建 ========================
function buildBackgroundCache() {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = CANVAS_W;
  bgCanvas.height = CANVAS_H;
  const offCtx = bgCanvas.getContext('2d');

  // 渐变背景
  const grad = offCtx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 50, CANVAS_W / 2, CANVAS_H / 2, 500);
  grad.addColorStop(0, '#1a1020');
  grad.addColorStop(1, '#0a0510');
  offCtx.fillStyle = grad;
  offCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 网格
  offCtx.strokeStyle = 'rgba(60,40,30,0.15)';
  offCtx.lineWidth = 0.5;
  for (let x = 0; x <= CANVAS_W; x += GRID) {
    offCtx.beginPath(); offCtx.moveTo(x, PLAY_TOP); offCtx.lineTo(x, PLAY_BOTTOM); offCtx.stroke();
  }
  for (let y = PLAY_TOP; y <= PLAY_BOTTOM; y += GRID) {
    offCtx.beginPath(); offCtx.moveTo(0, y); offCtx.lineTo(CANVAS_W, y); offCtx.stroke();
  }

  // 路径
  // 发光
  offCtx.strokeStyle = 'rgba(80,60,40,0.4)';
  offCtx.lineWidth = GRID * 1.5;
  offCtx.lineCap = 'round'; offCtx.lineJoin = 'round';
  offCtx.beginPath();
  for (let i = 0; i < pathPts.length; i++) {
    if (i === 0) offCtx.moveTo(pathPts[i].x, pathPts[i].y);
    else offCtx.lineTo(pathPts[i].x, pathPts[i].y);
  }
  offCtx.stroke();
  // 表面
  offCtx.strokeStyle = '#2a1a0a';
  offCtx.lineWidth = GRID * 1.1;
  offCtx.beginPath();
  for (let i = 0; i < pathPts.length; i++) {
    if (i === 0) offCtx.moveTo(pathPts[i].x, pathPts[i].y);
    else offCtx.lineTo(pathPts[i].x, pathPts[i].y);
  }
  offCtx.stroke();
  // 边缘光
  offCtx.strokeStyle = 'rgba(200,160,80,0.15)';
  offCtx.lineWidth = GRID * 1.2;
  offCtx.beginPath();
  for (let i = 0; i < pathPts.length; i++) {
    if (i === 0) offCtx.moveTo(pathPts[i].x, pathPts[i].y);
    else offCtx.lineTo(pathPts[i].x, pathPts[i].y);
  }
  offCtx.stroke();

  // 道场建筑 (不含血条)
  const endIdx = pathPts.length - 1;
  const endPt = pathPts[endIdx];
  offCtx.save();
  offCtx.translate(endPt.x - 15, endPt.y);
  offCtx.fillStyle = '#3a2510';
  offCtx.fillRect(-20, -30, 40, 35);
  offCtx.fillStyle = '#8b4513';
  offCtx.beginPath();
  offCtx.moveTo(-25, -30);
  offCtx.lineTo(0, -50);
  offCtx.lineTo(25, -30);
  offCtx.closePath();
  offCtx.fill();
  offCtx.fillStyle = '#cc8833';
  offCtx.fillRect(-6, -15, 12, 20);
  offCtx.fillStyle = '#ffcc44';
  offCtx.font = '10px sans-serif';
  offCtx.textAlign = 'center';
  offCtx.fillText('道场', 0, -62);
  offCtx.restore();
}

// ======================== 背景粒子 ========================
function initBgParticles() {
  bgParticles = [];
  for (let i = 0; i < 30; i++) {
    bgParticles.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * (PLAY_BOTTOM - PLAY_TOP) + PLAY_TOP,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.3 - 0.1,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.3 + 0.1,
      life: Math.random() * (BG_PARTICLE_LIFE_RANGE[1] - BG_PARTICLE_LIFE_RANGE[0]) + BG_PARTICLE_LIFE_RANGE[0]
    });
  }
}
initBgParticles();

// ======================== 波次生成 ========================
function buildWave(waveNum, levelConfig) {
  const list = [];
  if (levelConfig) {
    const baseHp = levelConfig.hpMult;
    const spdMult = levelConfig.speedMult;
    const isBossWave = levelConfig.hasBoss && (waveNum === levelConfig.waves);
    const baseCount = levelConfig.baseCount;
    const types = levelConfig.enemyTypes;
    if (isBossWave) {
      const mCount = Math.floor(baseCount * 0.6);
      for (let i = 0; i < mCount; i++) list.push({ type: 'minion', hpMult: baseHp, speedMult: spdMult });
      if (types.includes('beast')) {
        const bCount = Math.floor(baseCount * 0.3);
        for (let i = 0; i < bCount; i++) list.push({ type: 'beast', hpMult: baseHp, speedMult: spdMult });
      }
      if (types.includes('elite') && waveNum > 5) list.push({ type: 'elite', hpMult: baseHp, speedMult: spdMult });
      const bossHpMult = baseHp * (1 + (levelConfig.num - 5) * 0.15);
      list.push({ type: 'boss', hpMult: bossHpMult, speedMult: spdMult });
    } else {
      const mCount = Math.floor(baseCount * (waveNum / levelConfig.waves) * 1.2);
      for (let i = 0; i < Math.max(1, mCount); i++) list.push({ type: 'minion', hpMult: baseHp, speedMult: spdMult });
      if (types.includes('beast') && waveNum >= 2) {
        const bCount = Math.floor(baseCount * 0.3 * (waveNum / levelConfig.waves));
        for (let i = 0; i < bCount; i++) list.push({ type: 'beast', hpMult: baseHp, speedMult: spdMult });
      }
      if (types.includes('elite') && waveNum >= Math.ceil(levelConfig.waves * 0.5)) {
        const eCount = Math.min(2, Math.floor(waveNum / levelConfig.waves * 2));
        for (let i = 0; i < eCount; i++) list.push({ type: 'elite', hpMult: baseHp, speedMult: spdMult });
      }
    }
  } else {
    const baseHp = 1 + (waveNum - 1) * 0.25;
    const spdMult = 1 + (waveNum - 1) * 0.02;
    if (waveNum % 5 === 0) {
      const mCount = Math.floor(3 + waveNum * 0.4);
      for (let i = 0; i < mCount; i++) list.push({ type: 'minion', hpMult: baseHp, speedMult: spdMult });
      if (waveNum >= 8) {
        for (let i = 0; i < Math.floor(waveNum / 6); i++) list.push({ type: 'beast', hpMult: baseHp, speedMult: spdMult });
      }
      if (waveNum >= 15) list.push({ type: 'elite', hpMult: baseHp * 1.5, speedMult: spdMult });
      const bossHpMult = baseHp * (1 + (waveNum - 5) * 0.2);
      list.push({ type: 'boss', hpMult: bossHpMult, speedMult: spdMult });
    } else {
      const mCount = Math.floor(3 + waveNum * 0.7);
      for (let i = 0; i < mCount; i++) list.push({ type: 'minion', hpMult: baseHp, speedMult: spdMult });
      if (waveNum >= 4) {
        for (let i = 0; i < Math.floor((waveNum - 2) * 0.4); i++) list.push({ type: 'beast', hpMult: baseHp, speedMult: spdMult });
      }
      if (waveNum >= 8) list.push({ type: 'elite', hpMult: baseHp * 1.2, speedMult: spdMult });
    }
  }
  return list;
}

// ======================== 生成敌人 ========================
function spawnEnemy(def) {
  const typeDef = ENEMY_TYPES[def.type];
  const spdMult = def.speedMult || 1;
  const e = enemyPool.acquire();
  e.type = def.type;
  e.hp = Math.round(typeDef.hp * def.hpMult);
  e.maxHp = Math.round(typeDef.hp * def.hpMult);
  e.speed = typeDef.speed * spdMult;
  e.baseSpeed = typeDef.speed * spdMult;
  e.reward = Math.round(typeDef.reward * (1 + def.hpMult * 0.2));
  e.color = typeDef.color;
  e.radius = typeDef.radius;
  e.dist = 0;
  e.alive = true;
  e.slowTimer = 0;
  e.slowFactor = 1;
  e.frozen = false;
  e.freezeTimer = 0;
  const pos = getPositionOnPath(pathPts, 0);
  e.px = pos.x; e.py = pos.y;
}

// ======================== 放置塔 ========================
function placeTower(type, col, row) {
  const def = TOWER_DEFS[type];
  if (gold < def.cost) {
    const btn = document.querySelector(`.towerBtn[data-type="${type}"]`);
    if (btn) { btn.style.borderColor = '#ff4444'; setTimeout(() => { btn.style.borderColor = ''; }, 300); }
    return false;
  }
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (isPathCell(col, row)) return false;
  if (towers.some(t => t.col === col && t.row === row)) return false;

  gold -= def.cost;
  towers.push({
    type, col, row, level: 0,
    x: col * GRID + GRID / 2,
    y: PLAY_TOP + row * GRID + GRID / 2,
    cooldown: 0, angle: 0, killCount: 0
  });
  playSound('place');
  updateUI();
  return true;
}

// ======================== 升级塔 ========================
function upgradeTowerFn(tower) {
  const def = TOWER_DEFS[tower.type];
  if (tower.level >= 3) return false;
  const cost = def.upgCosts[tower.level];
  if (gold < cost) return false;
  gold -= cost;
  tower.level++;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const p = particlePool.acquire();
    p.x = tower.x; p.y = tower.y;
    p.vx = Math.cos(angle) * (2 + Math.random() * 2);
    p.vy = Math.sin(angle) * (2 + Math.random() * 2);
    p.life = UPGRADE_PARTICLE_LIFE; p.maxLife = UPGRADE_PARTICLE_LIFE;
    p.color = '#ffcc44'; p.size = 4;
  }
  playSound('upgrade');
  updateUI();
  return true;
}

// ======================== 出售塔 ========================
function sellTowerFn(tower) {
  const def = TOWER_DEFS[tower.type];
  let refund = Math.round(def.cost * 0.6);
  for (let i = 0; i < tower.level; i++) refund += Math.round(def.upgCosts[i] * 0.6);
  gold += refund;
  towers = towers.filter(t => t !== tower);
  if (selectedPlacedTower === tower) { selectedPlacedTower = null; }
  closeUpgradePanel();
  playSound('sell');
  updateUI();
}

// ======================== 获取塔属性 ========================
function getTowerStats(tower) {
  const def = TOWER_DEFS[tower.type];
  const lvl = tower.level;
  return {
    damage: Math.round(def.damage * def.dmgMult[lvl]),
    range: Math.round(def.range * def.rangeMult[lvl]),
    fireRate: def.fireRate * def.rateMult[lvl],
    cost: def.upgCosts[lvl] || null,
    maxLevel: lvl >= 3
  };
}

// ======================== 空间哈希辅助：查找目标 ========================
function findTarget(tower) {
  const stats = getTowerStats(tower);
  const rangeSq = stats.range * stats.range;
  const candidates = spatialHash.query(tower.x, tower.y, stats.range);
  let best = null, bestDistSq = rangeSq + 1;
  for (const e of candidates) {
    if (!e.alive) continue;
    const dx = e.px - tower.x, dy = e.py - tower.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= rangeSq && distSq < bestDistSq) { bestDistSq = distSq; best = e; }
  }
  return best;
}

// ======================== 塔射击 ========================
function towerShoot(tower, target) {
  const stats = getTowerStats(tower);

  if (tower.type === 'thunder') {
    const chains = 1 + tower.level;
    const hit = new Set();
    const dx = target.px - tower.x, dy = target.py - tower.y;
    tower.angle = Math.atan2(dy, dx);

    applyDamage(target, stats.damage, tower);
    hit.add(target);

    const segments = [{ x1: tower.x, y1: tower.y, x2: target.px, y2: target.py, color: '#aaaaff' }];
    let prevPos = { x: target.px, y: target.py };
    for (let c = 1; c < chains; c++) {
      let nearest = null, nearDist = 80;
      const nearby = spatialHash.query(prevPos.x, prevPos.y, 80);
      for (const e of nearby) {
        if (!e.alive || hit.has(e)) continue;
        const d = Math.sqrt((e.px - prevPos.x) ** 2 + (e.py - prevPos.y) ** 2);
        if (d < nearDist) { nearDist = d; nearest = e; }
      }
      if (nearest) {
        hit.add(nearest);
        applyDamage(nearest, Math.round(stats.damage * 0.7), tower);
        segments.push({ x1: prevPos.x, y1: prevPos.y, x2: nearest.px, y2: nearest.py, color: '#aaaaff' });
        prevPos = { x: nearest.px, y: nearest.py };
        if (tower.level >= 1) applySlow(nearest, 0.5, 1.0);
      }
    }
    const eff = effectPool.acquire();
    eff.type = 'lightning'; eff.segments = segments;
    eff.life = LIGHTNING_EFFECT_LIFE; eff.maxLife = LIGHTNING_EFFECT_LIFE;
    eff.x = 0; eff.y = 0;
    playSound('shoot');
  } else {
    const dx = target.px - tower.x, dy = target.py - tower.y;
    tower.angle = Math.atan2(dy, dx);
    const speed = 6;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) return;
    const p = projectilePool.acquire();
    p.x = tower.x; p.y = tower.y;
    p.vx = (dx / d) * speed; p.vy = (dy / d) * speed;
    p.damage = stats.damage;
    p.towerType = tower.type; p.towerLevel = tower.level;
    p.target = target;
    p.alive = true;
    p.life = 0;
    playSound('shoot');
  }
}

// ======================== 减速 / 冻结 ========================
function applySlow(enemy, factor, duration) {
  if (enemy.frozen) return;
  if (factor < enemy.slowFactor || enemy.slowTimer <= 0) {
    enemy.slowFactor = factor;
    enemy.slowTimer = duration;
  } else if (duration > enemy.slowTimer) {
    enemy.slowTimer = duration;
  }
}

// ======================== 伤害 + 伤害数字 ========================
function applyDamage(enemy, damage, tower) {
  if (!enemy || !enemy.alive) return;
  enemy.hp -= damage;

  // 浮动伤害数字
  const dn = damageNumberPool.acquire();
  dn.x = enemy.px; dn.y = enemy.py - enemy.radius - 5;
  dn.text = String(damage); dn.life = DAMAGING_NUMBER_LIFE; dn.maxLife = DAMAGING_NUMBER_LIFE;
  dn.vy = DAMAGING_NUMBER_VY;

  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    gold += enemy.reward;
    if (tower) tower.killCount++;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const p = particlePool.acquire();
      p.x = enemy.px; p.y = enemy.py;
      p.vx = Math.cos(angle) * (1 + Math.random() * 2);
      p.vy = Math.sin(angle) * (1 + Math.random() * 2);
      p.life = DEATH_PARTICLE_LIFE; p.maxLife = DEATH_PARTICLE_LIFE;
      p.color = enemy.color; p.size = 3;
    }
    playSound('kill');
    updateUI();
  }
}

// ======================== 弹道命中 ========================
function projectileHit(proj) {
  const target = proj.target;
  if (!target || !target.alive) return;
  const dx = target.px - proj.x, dy = target.py - proj.y;
  if (Math.sqrt(dx * dx + dy * dy) > 15) return;
  proj.alive = false;

  if (proj.towerType === 'sword') {
    applyDamage(target, proj.damage, null);
    const eff = effectPool.acquire();
    eff.type = 'slash'; eff.x = target.px; eff.y = target.py;
    eff.life = SLASH_EFFECT_LIFE; eff.maxLife = SLASH_EFFECT_LIFE;
    eff.segments = null;
    if (proj.towerLevel >= 2) {
      const nearby = spatialHash.query(target.px, target.py, 40);
      for (const e of nearby) {
        if (!e.alive || e === target) continue;
        const d = Math.sqrt((e.px - target.px) ** 2 + (e.py - target.py) ** 2);
        if (d < 40) applyDamage(e, Math.round(proj.damage * 0.5), null);
      }
    }
  } else if (proj.towerType === 'fire') {
    const radius = 35 + proj.towerLevel * 12;
    fireZones.push({
      x: target.px, y: target.py, radius,
      duration: (120 + proj.towerLevel * 40) / 60,
      maxDuration: (120 + proj.towerLevel * 40) / 60,
      damage: Math.max(2, Math.round(proj.damage * 0.25)),
      tickTimer: 0, towerLevel: proj.towerLevel,
      flames: Array.from({ length: 5 }, () => ({
        ox: (Math.random() - 0.5) * radius * 0.8,
        oy: (Math.random() - 0.5) * radius * 0.8,
        phase: Math.random() * Math.PI * 2
      }))
    });
    applyDamage(target, proj.damage, null);
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      const p = particlePool.acquire();
      p.x = target.px; p.y = target.py;
      p.vx = Math.cos(angle) * spd; p.vy = Math.sin(angle) * spd;
      p.life = FIRE_PARTICLE_LIFE; p.maxLife = FIRE_PARTICLE_LIFE;
      p.color = Math.random() > 0.5 ? '#ff6633' : '#ffcc44';
      p.size = 3 + Math.random() * 3;
    }
  } else if (proj.towerType === 'ice') {
    applyDamage(target, proj.damage, null);
    const slowDur = 1.5 + proj.towerLevel * 0.5;
    const slowAmt = 0.3 + proj.towerLevel * 0.15;
    applySlow(target, Math.max(0.15, 1 - slowAmt), slowDur);
    if (proj.towerLevel >= 3) {
      target.frozen = true;
      target.freezeTimer = FREEZE_DURATION;
      target.slowFactor = 0;
    }
    const eff = effectPool.acquire();
    eff.type = 'ice'; eff.x = target.px; eff.y = target.py;
    eff.life = ICE_EFFECT_LIFE; eff.maxLife = ICE_EFFECT_LIFE;
    eff.segments = null;
  }
}

// ======================== 开始波次 ========================
function startWave() {
  currentWave++;
  if (currentWave > totalWaves) {
    if (gameMode === 'level') winLevel();
    else endlessWaveComplete();
    return;
  }

  const levelConfig = gameMode === 'level' ? LEVELS[currentLevel - 1] : null;
  const isBossWave = gameMode === 'level'
    ? (levelConfig.hasBoss && currentWave === levelConfig.waves)
    : (currentWave % 5 === 0);

  waveQueue = buildWave(currentWave, levelConfig);
  spawnTimer = 0;
  gameState = 'spawning';

  if (isBossWave) {
    bossWarnTimer = BOSS_WARN_DURATION;
    document.getElementById('bossWarn').style.opacity = '1';
    playSound('boss');
  } else {
    playSound('wave');
  }
  updateUI();
}

// ======================== 准备阶段 ========================
function startPrep() {
  prepTimer = PREP_TIME;
  gameState = 'prep';
  document.getElementById('countdown').style.opacity = '1';
  gold += 10;
  updateUI();
}

// ======================== UI 更新 ========================
function updateUI() {
  document.getElementById('goldDisplay').textContent = gold;
  document.getElementById('hpBar').style.width = `${Math.max(0, (hp / MAX_HP) * 100)}%`;
  document.getElementById('hpText').textContent = `${hp}/${MAX_HP}`;
  document.getElementById('waveDisplay').textContent = currentWave;

  const modeLabel = document.getElementById('modeDisplay');
  const modeIcon = document.getElementById('modeIcon');
  const waveTotal = document.getElementById('waveTotal');
  const waveLabel = document.getElementById('waveLabel');

  if (gameMode === 'level') {
    modeLabel.textContent = `关卡 ${currentLevel}`;
    modeIcon.textContent = '📜';
    waveTotal.textContent = totalWaves;
    waveLabel.textContent = '波次:';
  } else {
    modeLabel.textContent = '无尽模式';
    modeIcon.textContent = '♾️';
    waveTotal.textContent = '∞';
    waveLabel.textContent = '波次:';
  }

  document.querySelectorAll('.towerBtn').forEach(btn => {
    const type = btn.dataset.type;
    const cost = TOWER_DEFS[type].cost;
    btn.classList.toggle('selected', selectedTowerType === type);
    btn.classList.toggle('disabled', gold < cost);
  });
}

function closeUpgradePanel() {
  document.getElementById('upgradePanel').style.display = 'none';
}

function showUpgradePanel(tower) {
  const def = TOWER_DEFS[tower.type];
  const stats = getTowerStats(tower);
  const panel = document.getElementById('upgradePanel');
  const info = document.getElementById('upgInfo');
  const btn = document.getElementById('upgBtn');

  const stars = '⭐'.repeat(tower.level + 1);
  let html = `<b>${def.name}</b> <span class="stars">${stars}</span><br>`;
  html += `伤害:${stats.damage} 范围:${stats.range}<br>`;
  if (stats.maxLevel) {
    html += `<span style="color:#ffcc44">已满级</span>`;
    btn.style.display = 'none';
  } else {
    html += `升级: 💎${stats.cost}`;
    btn.style.display = '';
    btn.textContent = `升级 (💎${stats.cost})`;
    btn.style.opacity = gold >= stats.cost ? '1' : '0.4';
  }
  info.innerHTML = html;
  panel.style.display = 'flex';
}

// ======================== 屏幕管理 ========================
function hideAllScreens() {
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('levelSelect').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
}

function showMainMenu() {
  hideAllScreens();
  gameState = 'menu';
  document.getElementById('mainMenu').style.display = 'flex';
  document.getElementById('topBar').style.display = 'none';
  document.getElementById('bottomBar').style.display = 'none';
  document.getElementById('upgradePanel').style.display = 'none';
  document.getElementById('countdown').style.opacity = '0';
  document.getElementById('bossWarn').style.opacity = '0';
}

function showLevelSelect() {
  hideAllScreens();
  gameState = 'levelSelect';
  buildLevelSelectGrid();
  document.getElementById('levelSelect').style.display = 'flex';
  document.getElementById('topBar').style.display = 'none';
  document.getElementById('bottomBar').style.display = 'none';
  document.getElementById('upgradePanel').style.display = 'none';
}

function buildLevelSelectGrid() {
  const grid = document.getElementById('levelSelectGrid');
  grid.innerHTML = '';

  for (let i = 0; i < LEVELS.length; i++) {
    const lv = LEVELS[i];
    const card = document.createElement('div');
    card.className = 'levelCard';

    const isUnlocked = (i === 0) || !!levelProgress[i - 1];
    const isCompleted = !!levelProgress[i];

    if (!isUnlocked) card.classList.add('locked');
    if (isCompleted) card.classList.add('completed');

    let badge = '';
    if (isCompleted) badge = '<span class="lvlBadge">✅</span>';
    else if (!isUnlocked) badge = '<span class="lvlBadge">🔒</span>';

    card.innerHTML = `<span class="lvlNum">${lv.num}</span><span class="lvlInfo">${lv.waves}波</span><span class="lvlReward">💎${lv.reward}</span>${badge}`;

    if (isUnlocked) card.onclick = () => startLevel(lv.num);

    grid.appendChild(card);
  }
}

// ======================== 开始关卡模式 ========================
function startLevel(levelNum) {
  ensureAudio();
  hideAllScreens();
  gameMode = 'level';
  currentLevel = levelNum;
  const config = LEVELS[levelNum - 1];
  totalWaves = config.waves;
  gold = config.initialGold;
  hp = MAX_HP;
  currentWave = 0;
  selectedTowerType = null;
  selectedPlacedTower = null;
  towers = [];
  waveQueue = [];
  closeUpgradePanel();
  initPath();
  buildBackgroundCache();

  enemyPool.releaseAll();
  projectilePool.releaseAll();
  effectPool.releaseAll();
  particlePool.releaseAll();
  damageNumberPool.releaseAll();
  fireZones = [];

  document.getElementById('topBar').style.display = 'flex';
  document.getElementById('bottomBar').style.display = 'flex';

  updateUI();
  gameState = 'prep';
  startPrep();
}

// ======================== 开始无尽模式 ========================
function startEndless() {
  ensureAudio();
  hideAllScreens();
  gameMode = 'endless';
  currentLevel = 0;
  totalWaves = Infinity;
  gold = 100;
  hp = MAX_HP;
  currentWave = 0;
  selectedTowerType = null;
  selectedPlacedTower = null;
  towers = [];
  waveQueue = [];
  closeUpgradePanel();
  initPath();
  buildBackgroundCache();

  enemyPool.releaseAll();
  projectilePool.releaseAll();
  effectPool.releaseAll();
  particlePool.releaseAll();
  damageNumberPool.releaseAll();
  fireZones = [];

  document.getElementById('topBar').style.display = 'flex';
  document.getElementById('bottomBar').style.display = 'flex';

  updateUI();
  gameState = 'prep';
  startPrep();
}

// ======================== 关卡胜利 ========================
function winLevel() {
  gameState = 'won';
  const config = LEVELS[currentLevel - 1];
  levelProgress[currentLevel - 1] = true;
  try { localStorage.setItem('ctd_level_progress', JSON.stringify(levelProgress)); } catch (e) {}
  gold += config.reward;

  document.getElementById('resultMode').textContent = `关卡 ${currentLevel}`;
  document.getElementById('endTitle').textContent = '🎉 关卡完成!';
  document.getElementById('endSubtitle').textContent = `获得 💎${config.reward} 灵石奖励`;
  document.getElementById('resultStats').innerHTML = `
    <div>波次: <span class="highlight">${currentWave}/${totalWaves}</span></div>
    <div>剩余 HP: <span class="highlight">${hp}/${MAX_HP}</span></div>
    <div>灵石: <span class="highlight">${gold}</span></div>
  `;

  const nextBtn = document.getElementById('resultRetry');
  if (currentLevel < 20) {
    nextBtn.textContent = `下一关 (第 ${currentLevel + 1} 关)`;
    nextBtn.onclick = () => startLevel(currentLevel + 1);
  } else {
    nextBtn.textContent = '🏆 全部通关!';
    nextBtn.onclick = () => showMainMenu();
  }

  document.getElementById('endlessBestDisplay').innerHTML = '';
  document.getElementById('resultScreen').style.display = 'flex';
  playSound('win');
}

function endlessWaveComplete() {
  startPrep();
}

// ======================== 失败 ========================
function loseGame() {
  gameState = 'lost';

  if (gameMode === 'endless') {
    if (currentWave > endlessHighWave) {
      endlessHighWave = currentWave;
      try { localStorage.setItem('ctd_endless_high', String(endlessHighWave)); } catch (e) {}
    }
  }

  document.getElementById('resultMode').textContent = gameMode === 'level' ? `关卡 ${currentLevel}` : '无尽模式';
  document.getElementById('endTitle').textContent = '💀 道场覆灭';
  document.getElementById('endSubtitle').textContent = `你坚持到了第 ${currentWave} 波`;

  document.getElementById('resultStats').innerHTML = `
    <div>波次: <span class="highlight">${currentWave}</span></div>
    <div>剩余 HP: <span class="highlight">0/${MAX_HP}</span></div>
    <div>灵石: <span class="highlight">${gold}</span></div>
  `;

  const retryBtn = document.getElementById('resultRetry');
  if (gameMode === 'level') {
    retryBtn.textContent = `重挑战关卡 ${currentLevel}`;
    retryBtn.onclick = () => startLevel(currentLevel);
  } else {
    retryBtn.textContent = '♾️ 再来一次';
    retryBtn.onclick = () => startEndless();
  }

  const bestDiv = document.getElementById('endlessBestDisplay');
  if (gameMode === 'endless') {
    bestDiv.innerHTML = `<p class="endless-best">🏆 最高纪录: 第 ${endlessHighWave} 波</p>`;
  } else {
    bestDiv.innerHTML = '';
  }

  document.getElementById('resultScreen').style.display = 'flex';
  playSound('lose');
}

function retryGame() {
  document.getElementById('resultScreen').style.display = 'none';
  if (gameMode === 'level') startLevel(currentLevel);
  else startEndless();
}

// ======================== 暂停 / 变速 ========================
window.togglePause = function() {
  gameSpeed = gameSpeed === 0 ? 1 : 0;
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.textContent = gameSpeed === 0 ? '▶️' : '⏸️';
};

window.cycleSpeed = function() {
  if (gameSpeed === 0) { gameSpeed = 1; document.getElementById('pauseBtn').textContent = '⏸️'; }
  else if (gameSpeed === 1) gameSpeed = 2;
  else if (gameSpeed === 2) gameSpeed = 4;
  else gameSpeed = 1;
  const btn = document.getElementById('speedBtn');
  if (btn) btn.textContent = gameSpeed + 'x';
};

document.addEventListener('keydown', e => {
  if (e.key === 'p' || e.key === 'P') window.togglePause();
});

// ======================== 全局 onclick 函数 ========================
window.selectTower = function(type) {
  ensureAudio();
  if (selectedTowerType === type) { selectedTowerType = null; }
  else { selectedTowerType = type; selectedPlacedTower = null; closeUpgradePanel(); }
  updateUI();
};

window.upgradeTower = function() {
  if (!selectedPlacedTower) return;
  if (upgradeTowerFn(selectedPlacedTower)) showUpgradePanel(selectedPlacedTower);
  updateUI();
};

window.sellTower = function() {
  if (!selectedPlacedTower) return;
  sellTowerFn(selectedPlacedTower);
};

window.closeUpgrade = function() {
  selectedPlacedTower = null;
  closeUpgradePanel();
};

// ======================== 鼠标处理 ========================
let mouseX = 0, mouseY = 0;
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener('click', (e) => {
  if (gameState !== 'prep' && gameState !== 'spawning' && gameState !== 'active') return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const col = Math.floor(mx / GRID);
  const row = Math.floor((my - PLAY_TOP) / GRID);

  const clickedTower = towers.find(t => t.col === col && t.row === row);
  if (clickedTower) {
    if (selectedTowerType) selectedTowerType = null;
    selectedPlacedTower = clickedTower;
    showUpgradePanel(clickedTower);
    updateUI();
    return;
  }

  if (selectedTowerType) { placeTower(selectedTowerType, col, row); return; }

  selectedPlacedTower = null;
  closeUpgradePanel();
});

// Touch support for mobile
function handleCanvasTap(clientX, clientY) {
  if (gameState !== 'prep' && gameState !== 'spawning' && gameState !== 'active') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  const mx = (clientX - rect.left) * scaleX;
  const my = (clientY - rect.top) * scaleY;
  const col = Math.floor(mx / GRID);
  const row = Math.floor((my - PLAY_TOP) / GRID);
  mouseX = mx; mouseY = my;
  const clickedTower = towers.find(t => t.col === col && t.row === row);
  if (clickedTower) {
    if (selectedTowerType) selectedTowerType = null;
    selectedPlacedTower = clickedTower;
    showUpgradePanel(clickedTower);
    updateUI();
    return;
  }
  if (selectedTowerType) { placeTower(selectedTowerType, col, row); return; }
  selectedPlacedTower = null;
  closeUpgradePanel();
}

let touchStartX = null, touchStartY = null;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  mouseX = (t.clientX - canvas.getBoundingClientRect().left) * (CANVAS_W / canvas.getBoundingClientRect().width);
  mouseY = (t.clientY - canvas.getBoundingClientRect().top) * (CANVAS_H / canvas.getBoundingClientRect().height);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (touchStartX !== null) {
    const t = e.changedTouches[0];
    const dx = Math.abs(t.clientX - touchStartX);
    const dy = Math.abs(t.clientY - touchStartY);
    if (dx < 15 && dy < 15) handleCanvasTap(t.clientX, t.clientY);
  }
  touchStartX = null;
  touchStartY = null;
});

// ======================== 绘制函数 ========================

function drawBgParticles() {
  for (const p of bgParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#ffcc88';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDojoHpBar() {
  const endIdx = pathPts.length - 1;
  const endPt = pathPts[endIdx];
  ctx.save();
  ctx.translate(endPt.x - 15, endPt.y);
  const barW = 50, barH = 6;
  ctx.fillStyle = '#331111';
  ctx.fillRect(-barW / 2, -58, barW, barH);
  ctx.fillStyle = hp > MAX_HP * 0.3 ? '#44cc44' : '#cc4444';
  ctx.fillRect(-barW / 2, -58, barW * (hp / MAX_HP), barH);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  ctx.strokeRect(-barW / 2, -58, barW, barH);
  ctx.restore();
}

function drawPlacementPreview() {
  if (!selectedTowerType) return;
  const col = Math.floor(mouseX / GRID);
  const row = Math.floor((mouseY - PLAY_TOP) / GRID);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

  const blocked = isPathCell(col, row) || towers.some(t => t.col === col && t.row === row);
  const canAfford = gold >= TOWER_DEFS[selectedTowerType].cost;
  const valid = !blocked && canAfford;

  ctx.fillStyle = valid ? 'rgba(100,255,100,0.2)' : 'rgba(255,50,50,0.2)';
  ctx.fillRect(col * GRID, PLAY_TOP + row * GRID, GRID, GRID);
  ctx.strokeStyle = valid ? 'rgba(100,255,100,0.6)' : 'rgba(255,50,50,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(col * GRID, PLAY_TOP + row * GRID, GRID, GRID);

  if (valid) {
    const stats = getTowerStats({ type: selectedTowerType, level: 0 });
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(col * GRID + GRID / 2, PLAY_TOP + row * GRID + GRID / 2, stats.range, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTowers() {
  for (const t of towers) {
    const def = TOWER_DEFS[t.type];
    const size = GRID * 0.35 + t.level * 3;

    if (selectedPlacedTower === t) {
      const stats = getTowerStats(t);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(t.x, t.y);

    const baseGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size + 4);
    baseGrad.addColorStop(0, def.color);
    baseGrad.addColorStop(0.7, '#3a2a1a');
    baseGrad.addColorStop(1, '#1a0a00');
    ctx.fillStyle = baseGrad;
    ctx.beginPath(); ctx.arc(0, 0, size + 4, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.3 + t.level * 0.2;
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    if (t.level >= 2) {
      const pulseAlpha = 0.1 + 0.05 * Math.sin(elapsedTime * 3);
      ctx.globalAlpha = pulseAlpha;
      ctx.strokeStyle = def.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, size + 8 + Math.sin(elapsedTime * 1.8) * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.font = `${14 + t.level * 3}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const icons = { sword: '⚔️', thunder: '⚡', fire: '🔥', ice: '❄️' };
    ctx.fillText(icons[t.type], 0, 0);

    ctx.fillStyle = '#ffcc44';
    ctx.font = '8px sans-serif';
    ctx.fillText('⭐'.repeat(t.level + 1), 0, size + 12);
    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of enemyPool.active) {
    if (!e.alive) continue;
    ctx.save();
    ctx.translate(e.px, e.py);

    if (e.frozen) {
      ctx.strokeStyle = 'rgba(100,200,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 4, 0, Math.PI * 2); ctx.stroke();
    }

    if (e.slowTimer > 0 && !e.frozen) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#66ddff';
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    const grad = ctx.createRadialGradient(0, -2, 0, 0, 0, e.radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, e.color);
    grad.addColorStop(1, '#220000');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();

    if (e.type === 'boss') {
      ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('👑', 0, -e.radius - 6);
    }

    if (e.hp < e.maxHp) {
      const barW = e.radius * 2.5, barH = 3;
      ctx.fillStyle = '#331111';
      ctx.fillRect(-barW / 2, -e.radius - 8, barW, barH);
      const hpRatio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : (hpRatio > 0.25 ? '#ccaa44' : '#cc4444');
      ctx.fillRect(-barW / 2, -e.radius - 8, barW * hpRatio, barH);
    }
    ctx.restore();
  }
}

function drawProjectiles() {
  for (const p of projectilePool.active) {
    if (!p.alive) continue;
    if (p.towerType === 'sword') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.globalAlpha = 0.4; ctx.fillStyle = '#ffdd44'; ctx.fillRect(-12, -1, 10, 2);
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffdd44'; ctx.fillRect(-8, -1.5, 16, 3);
      ctx.fillStyle = '#ffaa22'; ctx.fillRect(-8, -1, 16, 2);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(8, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (p.towerType === 'fire') {
      ctx.fillStyle = '#ff6633'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcc44'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    } else if (p.towerType === 'ice') {
      ctx.fillStyle = '#66ddff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawEffects() {
  for (const e of effectPool.active) {
    const alpha = e.life / e.maxLife;
    if (e.type === 'lightning') {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#aaaaff'; ctx.lineWidth = 2;
      ctx.shadowColor = '#8888ff'; ctx.shadowBlur = 8;
      for (const seg of e.segments) {
        const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
        const steps = 6;
        ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1);
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const ox = (Math.random() - 0.5) * 15 * alpha;
          const oy = (Math.random() - 0.5) * 15 * alpha;
          ctx.lineTo(seg.x1 + dx * t + ox, seg.y1 + dy * t + oy);
        }
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    } else if (e.type === 'slash') {
      ctx.strokeStyle = '#ffdd44'; ctx.lineWidth = 2; ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(e.x, e.y, 12 * (1 - alpha) + 5, -0.8, 0.8); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.type === 'ice') {
      ctx.strokeStyle = '#66ddff'; ctx.lineWidth = 2; ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(e.x, e.y, 15 * (1 - alpha) + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawFireZones() {
  for (const fz of fireZones) {
    const alpha = 0.3 * (fz.duration / fz.maxDuration);
    ctx.fillStyle = `rgba(255,100,30,${alpha})`;
    ctx.beginPath(); ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,200,50,${alpha * 0.6})`;
    for (const f of fz.flames) {
      const flickerY = Math.sin(elapsedTime * 4.8 + f.phase) * 4;
      ctx.beginPath(); ctx.arc(fz.x + f.ox, fz.y + f.oy + flickerY, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawParticles() {
  for (const p of particlePool.active) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDamageNumbers() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const d of damageNumberPool.active) {
    const alpha = Math.max(0, d.life / d.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 14px sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(d.text, d.x, d.y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d.text, d.x, d.y);
  }
  ctx.globalAlpha = 1;
}

// ======================== 实体更新 ========================

function updateBgParticles(dt) {
  for (const p of bgParticles) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt;
    if (p.life <= 0 || p.y < PLAY_TOP) {
      p.x = Math.random() * CANVAS_W;
      p.y = PLAY_BOTTOM;
      p.life = Math.random() * (BG_PARTICLE_LIFE_RANGE[1] - BG_PARTICLE_LIFE_RANGE[0]) + BG_PARTICLE_LIFE_RANGE[0];
    }
  }
}

function updateEnemies(dt) {
  const dtScale = dt * 60;
  for (const e of enemyPool.active) {
    if (!e.alive) continue;

    if (e.frozen) {
      e.freezeTimer -= dt;
      if (e.freezeTimer <= 0) e.frozen = false;
      const pos = getPositionOnPath(pathPts, e.dist);
      e.px = pos.x; e.py = pos.y;
      continue;
    }

    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      e.speed = e.baseSpeed * e.slowFactor;
      if (e.slowTimer <= 0) { e.speed = e.baseSpeed; e.slowFactor = 1; }
    }

    e.dist += e.speed * dtScale;
    const pos = getPositionOnPath(pathPts, e.dist);
    e.px = pos.x; e.py = pos.y;

    if (e.dist >= pathLength) {
      e.alive = false;
      const dmg = e.type === 'boss' ? 5 : (e.type === 'elite' ? 3 : (e.type === 'beast' ? 2 : 1));
      hp = Math.max(0, hp - dmg);
      playSound('hit');
      updateUI();
      if (hp <= 0) { loseGame(); return; }
    }
  }
  // 清理死亡敌人
  let i = 0;
  const active = enemyPool.active;
  while (i < active.length) {
    if (!active[i].alive) enemyPool.release(active[i]);
    else i++;
  }
}

function updateProjectiles(dt) {
  const dtScale = dt * 60;
  for (const p of projectilePool.active) {
    if (!p.alive) continue;
    p.x += p.vx * dtScale;
    p.y += p.vy * dtScale;
    p.life += dt;

    if (p.x < -20 || p.x > CANVAS_W + 20 || p.y < -20 || p.y > CANVAS_H + 20) {
      p.alive = false; continue;
    }
    if (p.target && p.target.alive) {
      projectileHit(p);
    } else {
      let hitFallback = false;
      for (const e of spatialHash.query(p.x, p.y, 15)) {
        if (!e.alive) continue;
        const d = Math.sqrt((e.px - p.x) ** 2 + (e.py - p.y) ** 2);
        if (d < 15) { p.target = e; projectileHit(p); hitFallback = true; break; }
      }
      if (!hitFallback && p.life > PROJECTILE_MAX_LIFE) p.alive = false;
    }
  }
  let i = 0;
  const active = projectilePool.active;
  while (i < active.length) {
    if (!active[i].alive) projectilePool.release(active[i]);
    else i++;
  }
}

function updateTowers(dt) {
  for (const t of towers) {
    if (t.cooldown > 0) { t.cooldown -= dt; continue; }
    const target = findTarget(t);
    if (target) {
      towerShoot(t, target);
      const stats = getTowerStats(t);
      t.cooldown = 1 / stats.fireRate;
    }
  }
}

function updateFireZones(dt) {
  for (const fz of fireZones) {
    fz.duration -= dt;
    fz.tickTimer += dt;
    if (fz.tickTimer >= FIRE_ZONE_TICK_INTERVAL) {
      fz.tickTimer -= FIRE_ZONE_TICK_INTERVAL;
      for (const e of spatialHash.query(fz.x, fz.y, fz.radius)) {
        if (!e.alive) continue;
        const d = Math.sqrt((e.px - fz.x) ** 2 + (e.py - fz.y) ** 2);
        if (d < fz.radius) applyDamage(e, fz.damage, null);
      }
    }
  }
  fireZones = fireZones.filter(fz => fz.duration > 0);
}

function updateEffects(dt) {
  let i = 0;
  const active = effectPool.active;
  while (i < active.length) {
    active[i].life -= dt;
    if (active[i].life <= 0) effectPool.release(active[i]);
    else i++;
  }
}

function updateParticles(dt) {
  const dtScale = dt * 60;
  let i = 0;
  const active = particlePool.active;
  while (i < active.length) {
    const p = active[i];
    p.x += p.vx * dtScale;
    p.y += p.vy * dtScale;
    const damp = Math.pow(0.95, dtScale);
    p.vx *= damp; p.vy *= damp;
    p.life -= dt;
    if (p.life <= 0) particlePool.release(p);
    else i++;
  }
}

function updateDamageNumbers(dt) {
  let i = 0;
  const active = damageNumberPool.active;
  while (i < active.length) {
    const d = active[i];
    d.y += d.vy * dt;
    d.life -= dt;
    if (d.life <= 0) damageNumberPool.release(d);
    else i++;
  }
}

// ======================== 主更新 ========================
function update(dt) {
  elapsedTime += dt;

  // Boss 警告淡出
  if (bossWarnTimer > 0) {
    bossWarnTimer -= dt;
    if (bossWarnTimer <= 0) {
      document.getElementById('bossWarn').style.opacity = '0';
    }
  }

  updateBgParticles(dt);

  if (gameState === 'menu' || gameState === 'levelSelect' || gameState === 'won' || gameState === 'lost') return;

  // 准备阶段
  if (gameState === 'prep') {
    prepTimer -= dt;
    const sec = Math.ceil(prepTimer);
    document.getElementById('countdown').textContent = `⏱️ 准备时间: ${sec}s | 选择防御塔 → 点击空地放置`;
    document.getElementById('countdown').style.opacity = '1';
    if (prepTimer <= 0) {
      document.getElementById('countdown').style.opacity = '0';
      startWave();
    }
    return;
  }

  // 生成阶段
  if (gameState === 'spawning') {
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL && waveQueue.length > 0) {
      spawnTimer -= SPAWN_INTERVAL;
      spawnEnemy(waveQueue.shift());
    }
    if (waveQueue.length === 0) gameState = 'active';
  }

  // 重建空间哈希
  spatialHash.clear();
  for (const e of enemyPool.active) { if (e.alive) spatialHash.insert(e); }

  updateEnemies(dt);

  // 波次完成检查
  if (gameState === 'active' && enemyPool.active.length === 0 && waveQueue.length === 0) {
    if (gameMode === 'level' && currentWave >= totalWaves) { winLevel(); return; }
    startPrep();
    return;
  }

  updateTowers(dt);
  updateProjectiles(dt);
  updateFireZones(dt);
  updateEffects(dt);
  updateParticles(dt);
  updateDamageNumbers(dt);
}

// ======================== 渲染 ========================
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0);
  drawBgParticles();
  drawDojoHpBar();
  drawFireZones();
  drawPlacementPreview();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawEffects();
  drawParticles();
  drawDamageNumbers();
}

// ======================== 游戏循环 ========================
let lastTime = 0;
function gameLoop(timestamp) {
  const rawDt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  const dt = rawDt * gameSpeed;
  if (gameSpeed > 0) update(dt);
  else elapsedTime += rawDt; // 暂停时不计入游戏时间
  render();
  requestAnimationFrame(gameLoop);
}

// 启动
window.addEventListener('error', (e) => {
  console.error('[TD Game Error]', e.message, e.error);
  const menu = document.getElementById('mainMenu');
  if (menu) {
    menu.innerHTML = `<div style="color:#ff4444;font-size:1.5em;text-align:center;padding:40px;">
      游戏加载出错<br><small style="color:#aaa">${e.message}</small></div>`;
  }
});
try {
  initPath();
  buildBackgroundCache();
  showMainMenu();
  requestAnimationFrame(gameLoop);
} catch (e) {
  console.error('[TD Init Error]', e);
  const menu = document.getElementById('mainMenu');
  if (menu) {
    menu.innerHTML = `<div style="color:#ff4444;font-size:1.5em;text-align:center;padding:40px;">
      游戏初始化失败<br><small style="color:#aaa">${e.message}</small></div>`;
  }
}
