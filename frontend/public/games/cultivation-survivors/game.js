// ============================================================
// 修仙幸存者 - Cultivation Survivor
// 纯 Canvas 2D + Web Audio API, 零外部依赖
// ============================================================

// ============ 常量配置 ============
const CONFIG = {
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1080,
  WORLD_WIDTH: 4000,
  WORLD_HEIGHT: 4000,
  PLAYER_SIZE: 16,
  PLAYER_BASE_HP: 100,
  PLAYER_BASE_SPEED: 180,
  PLAYER_BASE_DAMAGE: 15,
  BASE_FLYING_SWORD_COUNT: 1,
  FLYING_SWORD_SPEED: 350,
  FLYING_SWORD_COOLDOWN: 0.8,
  FLYING_SWORD_RANGE: 500,
  LEVELS_PER_REALM: 5,
  BOSS_INTERVAL: 120, // seconds
  SPAWN_BASE_INTERVAL: 0.5,
  SPAWN_MIN_INTERVAL: 0.08,
  GRID_CELL_SIZE: 100,
  MAX_PARTICLES: 600,
  MAX_DAMAGE_NUMBERS: 150,
  CAMERA_SMOOTH: 0.08,
};

// ============ 境界 ============
const REALMS = [
  { name: '炼气期', color: '#8f8', glowColor: 'rgba(128,255,128,0.3)' },
  { name: '筑基期', color: '#88f', glowColor: 'rgba(128,128,255,0.3)' },
  { name: '金丹期', color: '#fd0', glowColor: 'rgba(255,221,0,0.3)' },
  { name: '元婴期', color: '#f8f', glowColor: 'rgba(255,128,255,0.3)' },
  { name: '化神期', color: '#f44', glowColor: 'rgba(255,68,68,0.3)' },
  { name: '炼虚期', color: '#4ff', glowColor: 'rgba(68,255,255,0.3)' },
  { name: '合体期', color: '#f88', glowColor: 'rgba(255,136,136,0.3)' },
  { name: '渡劫期', color: '#ff0', glowColor: 'rgba(255,255,0,0.4)' },
  { name: '大乘期', color: '#fa0', glowColor: 'rgba(255,170,0,0.4)' },
  { name: '人仙', color: '#fff', glowColor: 'rgba(255,255,255,0.3)' },
  { name: '地仙', color: '#4f4', glowColor: 'rgba(68,255,68,0.3)' },
  { name: '天仙', color: '#88f', glowColor: 'rgba(136,136,255,0.4)' },
  { name: '金仙', color: '#ffd700', glowColor: 'rgba(255,215,0,0.4)' },
  { name: '太乙金仙', color: '#ff66ff', glowColor: 'rgba(255,102,255,0.4)' },
  { name: '大罗金仙', color: '#ff0000', glowColor: 'rgba(255,0,0,0.5)' },
];

// ============ 技能定义 ============
const SKILL_DEFS = [
  {
    id: 'flying_sword',
    name: '飞剑',
    icon: '🗡️',
    desc: '自动发射飞剑攻击敌人',
    maxLevel: 10,
    effect: (level) => ({ count: 1 + Math.floor(level / 4), damage: 12 + level * 5, cooldown: Math.max(0.3, 0.8 - level * 0.05), range: 500 + level * 50 }),
  },
  {
    id: 'sword_aura',
    name: '剑气',
    icon: '⚔️',
    desc: '周期性释放环形剑气攻击周围敌人',
    maxLevel: 10,
    effect: (level) => ({ hpPercentDmg: 0.05 + level * 0.005, radius: 80 + level * 20, duration: 0.3 + level * 0.1, cooldown: Math.max(1.0, 3.0 - level * 0.2) }),
  },
  {
    id: 'lightning',
    name: '雷法',
    icon: '⚡',
    desc: '随机雷击敌人，造成高额伤害',
    maxLevel: 10,
    effect: (level) => ({ minHpPercent: 0.10, maxHpPercent: 0.30, areaRadius: 40 + level * 5, strikeRadius: 150 + level * 20, count: 2 + Math.floor(level / 2), cooldown: Math.max(0.5, 2.0 - level * 0.15) }),
  },
  {
    id: 'shield',
    name: '护体真元',
    icon: '🛡️',
    desc: '产生护盾，减少受到的伤害',
    maxLevel: 10,
    effect: (level) => ({ reduction: Math.min(0.6, 0.15 + level * 0.05), duration: 3 + level, cooldown: Math.max(5, 15 - level) }),
  },
  {
    id: 'fireball',
    name: '火球术',
    icon: '🔥',
    desc: '发射火球，击中后爆炸造成范围伤害',
    maxLevel: 10,
    effect: (level) => ({ damage: 25 + level * 10, cooldown: Math.max(0.5, 1.5 - level * 0.1), explosionRadius: 50 + level * 15, speed: 280 }),
  },
  {
    id: 'sword_dance',
    name: '御剑术',
    icon: '🌀',
    desc: '飞剑围绕玩家旋转，对接触敌人造成伤害并减速',
    maxLevel: 10,
    effect: (level) => ({ extraSwords: level, hpPercentDmg: 0.02 + level * 0.02, orbitRadius: 50 + level * 10, rotationSpeed: 2 + level * 0.5, slowFactor: 0.5, slowDuration: 2 }),
  },
  {
    id: 'spirit_burst',
    name: '灵力爆发',
    icon: '💥',
    desc: '释放灵力对范围内敌人造成伤害，越近伤害越高',
    maxLevel: 10,
    effect: (level) => ({ maxHpPercent: 0.30, minHpPercent: 0.10, radius: 300 + level * 50, cooldown: Math.max(3, 10 - level * 0.7) }),
  },
  {
    id: 'agility',
    name: '身法',
    icon: '💨',
    desc: '提升移动速度',
    maxLevel: 10,
    effect: (level) => ({ speedBonus: 0.2 + level * 0.08 }),
  },
  {
    id: 'boomerang',
    name: '回旋镖',
    icon: '🪃',
    desc: '发射回旋镖飞出屏幕后飞回，穿透敌人',
    maxLevel: 10,
    effect: (level) => ({
      hpPercentDmg: 0.02 + level * 0.02,
      cooldown: Math.max(1.0, 3.0 - level * 0.2),
      count: Math.min(1 + Math.floor(level / 3), 4),
      size: 6 + level * 2,
      maxDistance: 800 + level * 100,
      speed: 400,
    }),
  },
  {
    id: 'frost_nova',
    name: '冰冻新星',
    icon: '❄️',
    desc: '周期性释放冰霜爆炸，冻结周围敌人',
    maxLevel: 10,
    effect: (level) => ({
      minHpPercent: 0.01 + (level - 1) * 0.004,
      maxHpPercent: 0.05 + (level - 1) * 0.004,
      cooldown: Math.max(2.0, 5.0 - level * 0.3),
      radius: 150 + level * 20,
      freezeDuration: 2.0 + level * 0.3,
      slowAmount: 0.8,
    }),
  },
];

// ============ 音效系统 ============
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    switch (type) {
      case 'hit': this._hit(t); break;
      case 'kill': this._kill(t); break;
      case 'levelup': this._levelup(t); break;
      case 'breakthrough': this._breakthrough(t); break;
      case 'damage': this._damage(t); break;
      case 'sword': this._sword(t); break;
      case 'lightning': this._lightning(t); break;
      case 'fire': this._fire(t); break;
      case 'burst': this._burst(t); break;
      case 'gameover': this._gameover(t); break;
      case 'select': this._select(t); break;
      case 'ultimate': this._ultimate(t); break;
    }
  }

  _tone(freq, duration, type = 'square', vol = 0.1, freqEnd = null) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + duration);
  }

  _noise(duration, vol = 0.05) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * vol;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(g);
    g.connect(this.ctx.destination);
    src.start();
    src.stop(this.ctx.currentTime + duration);
  }

  _hit(t) { this._tone(800, 0.05, 'square', 0.08); }
  _kill(t) { this._tone(600, 0.1, 'square', 0.06, 200); }
  _levelup(t) {
    this._tone(523, 0.15, 'square', 0.12);
    setTimeout(() => this._tone(659, 0.15, 'square', 0.12), 100);
    setTimeout(() => this._tone(784, 0.2, 'square', 0.12), 200);
  }
  _breakthrough(t) {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.3, 'sine', 0.15), i * 120);
    });
  }
  _damage(t) { this._tone(200, 0.15, 'sawtooth', 0.1, 100); }
  _sword(t) { this._tone(1200, 0.08, 'sine', 0.05, 800); }
  _lightning(t) { this._noise(0.2, 0.1); this._tone(300, 0.1, 'sawtooth', 0.08, 100); }
  _fire(t) { this._noise(0.15, 0.08); this._tone(400, 0.15, 'sine', 0.06, 200); }
  _burst(t) { this._tone(150, 0.3, 'sine', 0.1, 50); this._noise(0.3, 0.06); }
  _gameover(t) {
    [400, 350, 300, 200].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.4, 'sine', 0.1), i * 200);
    });
  }
  _select(t) { this._tone(1000, 0.1, 'sine', 0.1); this._tone(1200, 0.1, 'sine', 0.08); }

  /** 大招音效 — 震撼的雷鸣/天劫之声 (多层叠加) */
  _ultimate(t) {
    // 低频雷鸣轰鸣 (sub-bass rumble, 1.2秒持续)
    this._tone(40, 1.2, 'sine', 0.2, 20);
    // 闪电噼啪噪声 (持续 0.6 秒)
    this._noise(0.6, 0.15);
    // 中频冲击 (mid punch, 锯齿波冲击感)
    this._tone(200, 0.5, 'sawtooth', 0.1, 60);
    // 延迟 150ms: 高频闪烁 (模拟闪电噼啪余音)
    setTimeout(() => {
      this._noise(0.3, 0.08);
      this._tone(800, 0.15, 'square', 0.05, 200);
    }, 150);
    // 延迟 400ms: 延迟回响 (天劫余韵)
    setTimeout(() => {
      this._tone(80, 0.6, 'sine', 0.08, 30);
      this._noise(0.4, 0.06);
    }, 400);
  }
}

// ============ 空间分区 ============
class SpatialGrid {
  constructor(worldW, worldH, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldW / cellSize);
    this.rows = Math.ceil(worldH / cellSize);
    this.grid = new Map();
  }

  clear() { this.grid.clear(); }

  _key(cx, cy) { return cx * 10000 + cy; }

  insert(entity) {
    const cx = Math.floor(entity.x / this.cellSize);
    const cy = Math.floor(entity.y / this.cellSize);
    const key = this._key(cx, cy);
    let cell = this.grid.get(key);
    if (!cell) { cell = []; this.grid.set(key, cell); }
    cell.push(entity);
  }

  query(x, y, radius) {
    const results = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.grid.get(this._key(cx, cy));
        if (cell) {
          for (const e of cell) {
            const dx = e.x - x, dy = e.y - y;
            if (dx * dx + dy * dy <= radius * radius) results.push(e);
          }
        }
      }
    }
    return results;
  }

  queryRect(x, y, w, h) {
    const results = [];
    const minCX = Math.floor(x / this.cellSize);
    const maxCX = Math.floor((x + w) / this.cellSize);
    const minCY = Math.floor(y / this.cellSize);
    const maxCY = Math.floor((y + h) / this.cellSize);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.grid.get(this._key(cx, cy));
        if (cell) for (const e of cell) results.push(e);
      }
    }
    return results;
  }
}

// ============ 粒子系统 ============
class Particle {
  constructor(x, y, vx, vy, life, color, size, type = 'circle') {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.size = size; this.type = type;
    this.alive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    if (this.life <= 0) this.alive = false;
  }
}

class ParticleSystem {
  constructor(maxParticles) {
    this.particles = [];
    this.max = maxParticles;
  }

  emit(x, y, count, color, opts = {}) {
    const { speed = 100, life = 0.5, size = 3, type = 'circle', gravity = 0 } = opts;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) {
        this.particles.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd - gravity,
        life * (0.5 + Math.random() * 0.5),
        color,
        size * (0.5 + Math.random() * 0.5),
        type
      ));
    }
  }

  emitLine(x, y, tx, ty, color, count = 3, life = 0.3, size = 2) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) this.particles.shift();
      const t = Math.random();
      this.particles.push(new Particle(
        x + (tx - x) * t, y + (ty - y) * t,
        (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30,
        life * (0.5 + Math.random() * 0.5),
        color, size * (0.5 + Math.random()), 'circle'
      ));
    }
  }

  update(dt) {
    // In-place compaction: swap dead to end, then truncate (no new array allocation)
    let write = 0;
    for (let read = 0; read < this.particles.length; read++) {
      this.particles[read].update(dt);
      if (this.particles[read].alive) {
        if (write !== read) this.particles[write] = this.particles[read];
        write++;
      }
    }
    this.particles.length = write;
  }

  render(ctx, camX, camY) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const sx = p.x - camX;
      const sy = p.y - camY;
      if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'lightning') {
        ctx.fillRect(sx - p.size / 2, sy - p.size * 2, p.size, p.size * 4);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ============ 敌人 ============
const ENEMY_TYPES = {
  // 基础敌人 (炼气期)
  minion: {
    name: '小妖',
    hp: 20,
    speed: 50,
    size: 8,
    color: '#f44',
    xp: 5,
    damage: 8,
  },
  beast: {
    name: '妖兽',
    hp: 50,
    speed: 80,
    size: 12,
    color: '#f80',
    xp: 12,
    damage: 15,
  },
  elite: {
    name: '精英怪',
    hp: 150,
    speed: 60,
    size: 18,
    color: '#a0f',
    xp: 30,
    damage: 25,
  },
  boss: {
    name: 'Boss',
    hp: 500,
    speed: 40,
    size: 30,
    color: '#ffd700',
    xp: 200,
    damage: 40,
  },
  // 炼虚期敌人
  demon_cultivator: {
    name: '魔修',
    hp: 300,
    speed: 70,
    size: 14,
    color: '#8800ff',
    xp: 50,
    damage: 35,
  },
  // 合体期敌人
  ancient_beast: {
    name: '上古凶兽',
    hp: 600,
    speed: 90,
    size: 22,
    color: '#ff6600',
    xp: 80,
    damage: 55,
  },
  // 渡劫期敌人
  heavenly_demon: {
    name: '天魔',
    hp: 1000,
    speed: 100,
    size: 20,
    color: '#ff0066',
    xp: 120,
    damage: 80,
  },
  // 大乘期敌人
  void_cultivator: {
    name: '虚空修士',
    hp: 1800,
    speed: 110,
    size: 16,
    color: '#00ccff',
    xp: 180,
    damage: 110,
  },
  // 人仙敌人
  immortal_guardian: {
    name: '仙界守卫',
    hp: 3000,
    speed: 120,
    size: 18,
    color: '#ffffff',
    xp: 250,
    damage: 150,
  },
  // 地仙敌人
  earth_deity: {
    name: '地仙大能',
    hp: 5000,
    speed: 100,
    size: 20,
    color: '#44ff44',
    xp: 400,
    damage: 220,
  },
  // 天仙敌人
  celestial: {
    name: '天仙',
    hp: 8000,
    speed: 130,
    size: 22,
    color: '#8888ff',
    xp: 600,
    damage: 320,
  },
  // 金仙敌人
  golden_immortal: {
    name: '金仙',
    hp: 15000,
    speed: 140,
    size: 24,
    color: '#ffd700',
    xp: 1000,
    damage: 500,
  },
  // 太乙金仙敌人
  taiyi_immortal: {
    name: '太乙金仙',
    hp: 30000,
    speed: 150,
    size: 26,
    color: '#ff66ff',
    xp: 2000,
    damage: 800,
  },
  // 大罗金仙敌人
  daluo_immortal: {
    name: '大罗金仙',
    hp: 60000,
    speed: 160,
    size: 32,
    color: '#ff0000',
    xp: 5000,
    damage: 1500,
  },
  // 天劫Boss (每5级出现，免疫天劫)
  heavenly_boss: {
    name: '天劫之主',
    hp: 10000,
    speed: 60,
    size: 40,
    color: '#ff2200',
    xp: 500,
    damage: 200,
    immuneToUltimate: true,
    bossAttackInterval: 1.5,
  },
};

// 境界对应的敌人类型
const REALM_ENEMIES = {
  0: ['minion', 'beast'],         // 炼气期
  1: ['minion', 'beast', 'elite'], // 筑基期
  2: ['beast', 'elite'],           // 金丹期
  3: ['elite', 'beast'],           // 元婴期
  4: ['elite', 'beast', 'demon_cultivator'], // 化神期
  5: ['demon_cultivator', 'elite', 'ancient_beast'], // 炼虚期
  6: ['ancient_beast', 'demon_cultivator', 'heavenly_demon'], // 合体期
  7: ['heavenly_demon', 'ancient_beast', 'void_cultivator'], // 渡劫期
  8: ['void_cultivator', 'heavenly_demon', 'immortal_guardian'], // 大乘期
  9: ['immortal_guardian', 'void_cultivator', 'earth_deity'], // 人仙
  10: ['earth_deity', 'immortal_guardian', 'celestial'], // 地仙
  11: ['celestial', 'earth_deity', 'golden_immortal'], // 天仙
  12: ['golden_immortal', 'celestial', 'taiyi_immortal'], // 金仙
  13: ['taiyi_immortal', 'golden_immortal', 'daluo_immortal'], // 太乙金仙
  14: ['daluo_immortal', 'taiyi_immortal', 'golden_immortal'], // 大罗金仙
};

class Enemy {
  constructor(type, x, y, difficultyMult = 1) {
    const def = ENEMY_TYPES[type];
    this.type = type;
    this.x = x; this.y = y;
    this.hp = def.hp * difficultyMult;
    this.maxHp = this.hp;
    this.speed = def.speed;
    this.size = def.size;
    this.color = def.color;
    this.xp = Math.floor(def.xp * difficultyMult);
    this.damage = def.damage * difficultyMult;
    this.alive = true;
    this.hitFlash = 0;
    this.angle = Math.random() * Math.PI * 2;
    // Freeze state (frost nova)
    this.frozen = false;
    this.freezeTimer = 0;
    // Boss-specific properties
    this.immuneToUltimate = def.immuneToUltimate || false;
    this.bossAttackTimer = 0;
    this.bossAttackInterval = def.bossAttackInterval || 1.5; // seconds between boss attacks
  }

  update(dt, playerX, playerY) {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    this.angle += dt * 2;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.1;
    if (this.hp <= 0) this.alive = false;
  }

  render(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;
    if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) return;

    ctx.save();
    ctx.translate(sx, sy);

    // Glow for boss and high-tier enemies
    if (this.type === 'boss') {
      const glowGrad = ctx.createRadialGradient(0, 0, this.size * 0.5, 0, 0, this.size * 1.8);
      glowGrad.addColorStop(0, 'rgba(255,215,0,0.25)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glow for new realm-specific enemies (based on their color)
    const glowEnemies = ['demon_cultivator', 'ancient_beast', 'heavenly_demon', 'void_cultivator',
      'immortal_guardian', 'earth_deity', 'celestial', 'golden_immortal', 'taiyi_immortal', 'daluo_immortal', 'heavenly_boss'];
    if (glowEnemies.includes(this.type)) {
      const glowGrad = ctx.createRadialGradient(0, 0, this.size * 0.5, 0, 0, this.size * 2.2);
      glowGrad.addColorStop(0, this.color + '40');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Frozen visual overlay
    if (this.frozen && this.freezeTimer > 0) {
      const freezeAlpha = Math.min(1, this.freezeTimer / 2);
      ctx.fillStyle = `rgba(136,221,255,${freezeAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.3, 0, Math.PI * 2);
      ctx.fill();
      // Ice crystal lines
      ctx.strokeStyle = `rgba(136,221,255,${freezeAlpha * 0.6})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i + this.angle;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * this.size * 0.8, Math.sin(a) * this.size * 0.8);
        ctx.stroke();
      }
    }

    // Body
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Inner detail
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    const eyeOff = this.size * 0.3;
    ctx.beginPath();
    ctx.arc(-eyeOff, -eyeOff * 0.5, this.size * 0.15, 0, Math.PI * 2);
    ctx.arc(eyeOff, -eyeOff * 0.5, this.size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // HP bar for elites and high-tier enemies
    const hpBarEnemies = ['elite', 'boss', ...glowEnemies];
    if (hpBarEnemies.includes(this.type) && this.hp < this.maxHp) {
      const barW = this.size * 2.5;
      const barH = 4;
      const barY = -this.size - 8;
      ctx.fillStyle = '#333';
      ctx.fillRect(-barW / 2, barY, barW, barH);
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? '#4f4' : hpRatio > 0.25 ? '#ff0' : '#f44';
      ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
    }

    ctx.restore();
  }
}

// ============ 投射物 ============
class Projectile {
  constructor(x, y, vx, vy, damage, size, color, type = 'sword', life = 3) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.damage = damage; this.size = size; this.color = color;
    this.type = type; this.life = life; this.alive = true;
    this.rotation = 0;
    this.explosionRadius = 0;
    this.hitEnemies = new Set(); // Track hit enemies to avoid double damage
    this.target = null; // homing target (enemy reference)
  }

  update(dt) {
    // Homing: adjust velocity toward target each frame
    if (this.target && this.target.alive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && dist < CONFIG.FLYING_SWORD_RANGE * 1.5) {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.rotation += dt * 10;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;

    ctx.save();
    ctx.translate(sx, sy);

    if (this.type === 'sword') {
      // Draw sword with proper orientation along velocity
      ctx.rotate(Math.atan2(this.vy, this.vx));
      // Glow effect for visibility
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.size * 1.5, 0);
      ctx.lineTo(-this.size, -this.size * 0.4);
      ctx.lineTo(-this.size * 0.5, 0);
      ctx.lineTo(-this.size, this.size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Inner shine
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(this.size, 0);
      ctx.lineTo(-this.size * 0.3, -this.size * 0.15);
      ctx.lineTo(-this.size * 0.3, this.size * 0.15);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'fireball') {
      // Radial gradient fireball with glow
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.3, this.color);
      grad.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
      // Outer glow
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}

// ============ 轨道飞剑 (御剑术) ============
class OrbitSword {
  constructor(angle, radius, hpPercentDmg, size, color, slowFactor = 1, slowDuration = 0) {
    this.angle = angle;
    this.radius = radius;
    this.hpPercentDmg = hpPercentDmg;
    this.size = size;
    this.color = color;
    this.rotation = 0;
    this.slowFactor = slowFactor;
    this.slowDuration = slowDuration;
  }

  update(dt, rotationSpeed) {
    this.rotation += rotationSpeed * dt;
  }

  getPosition(px, py) {
    const a = this.angle + this.rotation;
    return { x: px + Math.cos(a) * this.radius, y: py + Math.sin(a) * this.radius };
  }
}

// ============ 回旋镖 ============
class Boomerang {
  constructor(x, y, angle, hpPercentDmg, size, maxDistance, speed) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.speed = speed;
    this.hpPercentDmg = hpPercentDmg;
    this.size = size;
    this.maxDistance = maxDistance;
    this.returning = false;
    this.alive = true;
    this.rotation = 0;
    this.distanceTraveled = 0;
    this.hitEnemies = new Set();
    this.onReturnHit = false;
  }

  update(dt, playerX, playerY) {
    if (!this.returning) {
      // Flying out
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.distanceTraveled += this.speed * dt;
      if (this.distanceTraveled >= this.maxDistance) {
        this.returning = true;
        this.hitEnemies.clear(); // Reset hit list for return trip damage
      }
    } else {
      // Flying back to player
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        this.alive = false; // Reached player
        return;
      }
      // Move toward player at constant speed
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    this.rotation += dt * 12;
  }

  render(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.rotation);

    // Orange glow
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 12;

    // Boomerang shape (V shape)
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(this.size * 1.5, 0);
    ctx.lineTo(-this.size * 0.5, -this.size);
    ctx.lineTo(-this.size * 0.2, 0);
    ctx.lineTo(-this.size * 0.5, this.size);
    ctx.closePath();
    ctx.fill();

    // Inner shine
    ctx.fillStyle = 'rgba(255,255,200,0.5)';
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size * 0.1, -this.size * 0.4);
    ctx.lineTo(-this.size * 0.1, this.size * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============ 装备定义 ============
const EQUIPMENT_TYPES = [
  {
    id: 'attack_rune',
    name: '攻击符文',
    icon: '⚔️',
    color: '#ff4444',
    glowColor: 'rgba(255,68,68,0.4)',
    effect: 'attack',
    value: 0.10, // +10% attack
    desc: '+10% 攻击力',
  },
  {
    id: 'hp_rune',
    name: '生命符文',
    icon: '❤️',
    color: '#44ff44',
    glowColor: 'rgba(68,255,68,0.4)',
    effect: 'maxHp',
    value: 15, // +15 max HP
    desc: '+15 最大HP',
  },
  {
    id: 'speed_rune',
    name: '速度符文',
    icon: '💨',
    color: '#4488ff',
    glowColor: 'rgba(68,136,255,0.4)',
    effect: 'speed',
    value: 0.08, // +8% speed
    desc: '+8% 移动速度',
  },
  {
    id: 'armor_rune',
    name: '护甲符文',
    icon: '🛡️',
    color: '#ffdd44',
    glowColor: 'rgba(255,221,68,0.4)',
    effect: 'defense',
    value: 0.05, // -5% damage taken
    desc: '-5% 受到伤害',
  },
  {
    id: 'xp_rune',
    name: '经验符文',
    icon: '✨',
    color: '#cc44ff',
    glowColor: 'rgba(204,68,255,0.4)',
    effect: 'xpBonus',
    value: 0.10, // +10% XP
    desc: '+10% 经验获取',
  },
  {
    id: 'luck_rune',
    name: '幸运符文',
    icon: '🍀',
    color: '#ffcc00',
    glowColor: 'rgba(255,204,0,0.4)',
    effect: 'dropRate',
    value: 0.10,
    desc: '+10% 装备掉落率',
  },
  {
    id: 'revive_token',
    name: '原地复活',
    icon: '💀',
    color: '#ff4488',
    glowColor: 'rgba(255,68,136,0.5)',
    effect: 'revive',
    value: 1,
    desc: '死亡后原地复活 (满血+3秒无敌)',
  },
  {
    id: 'skill_pack',
    name: '技能包',
    icon: '📦',
    color: '#44ddff',
    glowColor: 'rgba(68,221,255,0.5)',
    effect: 'skillPack',
    value: 1,
    desc: '随机提升一项已习得技能的等级',
  },
];

// 地面装备
class GroundEquipment {
  constructor(type, x, y) {
    const def = EQUIPMENT_TYPES[type];
    this.type = type;
    this.def = def;
    this.x = x;
    this.y = y;
    this.size = 12;
    this.alive = true;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.pulseTimer = 0;
    this.spawnTime = performance.now(); // 30秒过期计时
  }

  update(dt) {
    this.bobTimer += dt * 3;
    this.pulseTimer += dt;
    // 30秒后自动消失
    const elapsed = (performance.now() - this.spawnTime) / 1000;
    if (elapsed >= 30) {
      this.alive = false;
    }
  }

  render(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;
    if (sx < -30 || sx > ctx.canvas.width + 30 || sy < -30 || sy > ctx.canvas.height + 30) return;

    const bob = Math.sin(this.bobTimer) * 3;
    // 最后5秒闪烁加速
    const elapsed = (performance.now() - this.spawnTime) / 1000;
    const remaining = 30 - elapsed;
    let pulse = 0.6 + Math.sin(this.pulseTimer * 4) * 0.4;
    if (remaining < 5) {
      pulse = Math.sin(this.pulseTimer * 12) > 0 ? 0.8 : 0.2; // 快速闪烁
    }

    ctx.save();
    ctx.translate(sx, sy + bob);

    // Glow
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 15 * pulse;

    // Outer glow ring
    ctx.globalAlpha = 0.3 * pulse;
    ctx.fillStyle = this.def.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Rune diamond shape
    ctx.fillStyle = this.def.color;
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size * 0.7, 0);
    ctx.lineTo(0, this.size);
    ctx.lineTo(-this.size * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 0.5);
    ctx.lineTo(this.size * 0.3, 0);
    ctx.lineTo(0, this.size * 0.5);
    ctx.lineTo(-this.size * 0.3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============ 玩家 ============
class Player {
  constructor() {
    this.x = CONFIG.WORLD_WIDTH / 2;
    this.y = CONFIG.WORLD_HEIGHT / 2;
    this.size = CONFIG.PLAYER_SIZE; // FIX: was missing, causing broken collision detection
    this.hp = CONFIG.PLAYER_BASE_HP;
    this.maxHp = CONFIG.PLAYER_BASE_HP;
    this.speed = CONFIG.PLAYER_BASE_SPEED;
    this.damage = CONFIG.PLAYER_BASE_DAMAGE;
    this.xp = 0;
    this.xpToNext = 50;
    this.level = 1;
    this.realmIndex = 0;
    this.kills = 0;
    this.alive = true;

    // 被动属性 (升级自动提升)
    this.attackBonus = 0;       // 攻击力加成比例 (每级 +5%)
    this.defenseReduction = 1;  // 受到伤害倍率 (每级 -3%, 最低 0.5)
    this.skillDamageBonus = 0;  // 技能伤害加成比例 (每级 +5%)
    // 装备加成 (通过拾取符文获得)
    this.speedBonus = 0;        // 速度加成比例 (装备)
    this.xpBonus = 0;           // 经验获取加成比例 (装备)
    this.dropRateBonus = 0;     // 装备掉落率加成比例 (装备)

    // Skills
    this.skills = {};
    this.skillCooldowns = {};

    // Orbital swords
    this.orbitSwords = [];

    // Shield
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldReduction = 0;

    // Invulnerability frames (after breakthrough)
    this.invincible = false;
    this.invincibleTimer = 0;

    // Animations
    this.bobTimer = 0;
    this.flashTimer = 0;

    // 大招系统: 每击杀 10 个敌人充能一次大招 (天劫)
    this.ultimateCharge = 0;    // 当前充能击杀数 (0-10)
    this.ultimateReady = false;  // 是否充能完毕可释放天劫大招

    // 复活道具
    this.reviveTokens = 0;       // 原地复活道具数量
  }

  getSpeed() {
    let spd = this.speed;
    if (this.skills.agility) {
      const bonus = SKILL_DEFS[7].effect(this.skills.agility).speedBonus;
      spd *= (1 + bonus);
    }
    // Equipment speed bonus
    spd *= (1 + this.speedBonus);
    return spd;
  }

  takeDamage(amount) {
    if (this.invincible) return;
    let dmg = amount * this.defenseReduction; // 防御力减伤 (每级 -3%, 最低 50%)
    if (this.shieldActive) {
      dmg *= (1 - this.shieldReduction);
    }
    this.hp -= dmg;
    this.flashTimer = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  addXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(50 * Math.pow(1.3, this.level - 1));

      // 被动属性提升
      this.maxHp += 10;
      this.hp = this.maxHp; // 升级回复满血
      this.attackBonus += 0.05; // +5% 攻击力
      this.defenseReduction = Math.max(0.5, this.defenseReduction - 0.03); // -3% 受伤, 最低 50%
      this.skillDamageBonus += 0.05; // +5% 技能伤害

      if (this.level % CONFIG.LEVELS_PER_REALM === 1 && this.level > 1) {
        this.realmIndex = Math.min(Math.floor(this.level / CONFIG.LEVELS_PER_REALM), REALMS.length - 1);
        return { leveled: true, breakthrough: true };
      }
      return { leveled: true, breakthrough: false };
    }
    return { leveled: false, breakthrough: false };
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt, input) {
    // Movement with normalized diagonal
    let dx = 0, dy = 0;
    if (input.keys['w'] || input.keys['arrowup']) dy -= 1;
    if (input.keys['s'] || input.keys['arrowdown']) dy += 1;
    if (input.keys['a'] || input.keys['arrowleft']) dx -= 1;
    if (input.keys['d'] || input.keys['arrowright']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len; dy /= len;
    }
    const spd = this.getSpeed();
    this.x += dx * spd * dt;
    this.y += dy * spd * dt;

    // World bounds
    this.x = Math.max(20, Math.min(CONFIG.WORLD_WIDTH - 20, this.x));
    this.y = Math.max(20, Math.min(CONFIG.WORLD_HEIGHT - 20, this.y));

    // Animations
    this.bobTimer += dt * 5;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // Shield timer
    if (this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shieldActive = false;
    }
  }

  render(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;

    ctx.save();
    ctx.translate(sx, sy);

    // Glow
    const realm = REALMS[this.realmIndex];
    const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
    glowGrad.addColorStop(0, realm.glowColor);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();

    // Shield visual
    if (this.shieldActive) {
      ctx.strokeStyle = 'rgba(100,200,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(100,200,255,0.1)';
      ctx.fill();
    }

    // Body
    const bob = Math.sin(this.bobTimer) * 2;
    let bodyColor = realm.color;
    if (this.flashTimer > 0) {
      bodyColor = '#fff';
    } else if (this.invincible && Math.sin(this.bobTimer * 20) > 0) {
      bodyColor = 'rgba(255,255,255,0.5)';
    }
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, bob, CONFIG.PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Inner robe detail
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(0, bob, CONFIG.PLAYER_SIZE * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, bob - 3, 3, 0, Math.PI * 2);
    ctx.arc(4, bob - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-4, bob - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(4, bob - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============ 伤害数字 ============
class DamageNumber {
  constructor(x, y, value, color = '#fff') {
    this.x = x; this.y = y; this.value = value;
    this.color = color; this.life = 0.8; this.maxLife = 0.8;
    this.alive = true;
    this.isText = typeof value === 'string';
  }
  update(dt) {
    this.y -= 40 * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }
  render(ctx, camX, camY) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.isText ? 12 : 10 + (1 - alpha) * 5}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(this.isText ? this.value : Math.floor(this.value), this.x - camX, this.y - camY);
    ctx.globalAlpha = 1;
  }
}

// ============ 主游戏 ============
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new AudioSystem();
    this.particles = new ParticleSystem(CONFIG.MAX_PARTICLES);
    this.input = { keys: {} };
    this.state = 'start'; // start, playing, skillSelect, gameOver
    this.paused = false;

    // Game objects
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.boomerangs = [];
    this.damageNumbers = [];
    this.groundEquipment = [];
    this.frostNovaEffects = [];
    this.grid = null;

    // Timers
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.bossTimer = 0;
    this.difficultyMult = 1;

    // Camera (with smoothing)
    this.camX = 0;
    this.camY = 0;
    this.targetCamX = 0;
    this.targetCamY = 0;

    // Screen shake
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    // Breakthrough light beam
    this.breakthroughEffect = 0;

    // Background stars
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.WORLD_WIDTH,
        y: Math.random() * CONFIG.WORLD_HEIGHT,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1,
      });
    }

    // Setup input
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.key.toLowerCase()] = true;
      // 大招快捷键: E 键释放 (防止长按重复触发)
      if (e.key.toLowerCase() === 'e' && !this.input._eWasDown) {
        this.input._eWasDown = true;
        if (this.state === 'playing' && this.player && this.player.ultimateReady) {
          this.activateUltimate();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.input.keys[e.key.toLowerCase()] = false;
      if (e.key.toLowerCase() === 'e') {
        this.input._eWasDown = false;
      }
    });

    // UI buttons
    document.getElementById('startBtn').addEventListener('click', () => this.start());
    document.getElementById('restartBtn').addEventListener('click', () => this.start());

    // Mobile joystick
    const joystick = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    if (joystick && knob) {
      let joystickActive = false;
      const jc = { x: 0, y: 0 };
      joystick.addEventListener('touchstart', e => {
        e.preventDefault(); joystickActive = true;
        const rect = joystick.getBoundingClientRect();
        jc.x = rect.left + rect.width / 2; jc.y = rect.top + rect.height / 2;
      });
      joystick.addEventListener('touchmove', e => {
        e.preventDefault(); if (!joystickActive) return;
        const t = e.touches[0];
        let dx = (t.clientX - jc.x) / 35, dy = (t.clientY - jc.y) / 35;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) { dx /= dist; dy /= dist; }
        knob.style.transform = `translate(calc(-50% + ${dx * 25}px), calc(-50% + ${dy * 25}px))`;
        this.input.keys['w'] = dy < -0.3;
        this.input.keys['s'] = dy > 0.3;
        this.input.keys['a'] = dx < -0.3;
        this.input.keys['d'] = dx > 0.3;
      });
      const resetJoystick = () => {
        joystickActive = false;
        knob.style.transform = 'translate(-50%, -50%)';
        this.input.keys['w'] = false; this.input.keys['s'] = false;
        this.input.keys['a'] = false; this.input.keys['d'] = false;
      };
      joystick.addEventListener('touchend', resetJoystick);
      joystick.addEventListener('touchcancel', resetJoystick);
    }
    // Mobile fire button
    const fireBtn = document.getElementById('btn-fire-mobile');
    if (fireBtn) {
      fireBtn.addEventListener('touchstart', e => { e.preventDefault(); this.input.keys[' '] = true; });
      fireBtn.addEventListener('touchend', e => { e.preventDefault(); this.input.keys[' '] = false; });
    }

    // Resize
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') this.paused = !this.paused; });

    // 大招按钮点击支持 (Canvas 点击检测 — 支持触屏和鼠标)
    this.canvas.addEventListener('click', (e) => {
      if (this.state !== 'playing' || !this.player || !this.player.ultimateReady) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      // 大招按钮位置 (与 renderUltimateHUD 一致)
      const btnW = 140, btnH = 44;
      const btnX = this.canvas.width / 2 - btnW / 2;
      const btnY = this.canvas.height - btnH - 20;
      // 检查点击是否在按钮区域内 (加 10px 容差, 方便触屏操作)
      if (mx >= btnX - 10 && mx <= btnX + btnW + 10 && my >= btnY - 10 && my <= btnY + btnH + 10) {
        this.activateUltimate();
      }
    });
  }

  resize() {
    this.canvas.width = Math.min(window.innerWidth, CONFIG.CANVAS_WIDTH);
    this.canvas.height = Math.min(window.innerHeight, CONFIG.CANVAS_HEIGHT);
  }

  start() {
    this.audio.init();
    this.audio.resume();
    document.getElementById('startOverlay').style.display = 'none';
    document.getElementById('gameOverOverlay').classList.remove('active');

    this.player = new Player();
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.boomerangs = [];
    this.damageNumbers = [];
    this.groundEquipment = [];
    this.frostNovaEffects = [];
    this.grid = new SpatialGrid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT, CONFIG.GRID_CELL_SIZE);
    this.particles = new ParticleSystem(CONFIG.MAX_PARTICLES);
    this.gameTime = 0;
    this.spawnTimer = 0;
    this.bossTimer = 0;
    this.difficultyMult = 1;
    this.breakthroughEffect = 0;
    this.shakeTimer = 0;
    // 重置大招特效状态 (新游戏/重新开始)
    this.ultimateEffectTimer = 0;
    this.ultimateLightningBolts = [];
    this.ultimateFlashAlpha = 0;
    this.ultimateTextTimer = 0;
    this.state = 'playing';

    // Initialize camera
    this.camX = this.player.x - this.canvas.width / 2;
    this.camY = this.player.y - this.canvas.height / 2;
    this.targetCamX = this.camX;
    this.targetCamY = this.camY;

    // 默认赋予飞剑技能，游戏开始即可自动发射
    this.player.skills.flying_sword = 1;

    if (!this._loopStarted) {
      this._loopStarted = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state === 'playing' && !this.paused) {
      this.update(dt);
    }
    this.render(dt); // pass dt for fullscreen effect fade calculations

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.gameTime += dt;
    this.difficultyMult = 1 + this.gameTime / 120;

    // Spawn enemies
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      const interval = Math.max(CONFIG.SPAWN_MIN_INTERVAL, CONFIG.SPAWN_BASE_INTERVAL - this.gameTime * 0.003);
      this.spawnTimer = interval;
    }

    // Boss spawn
    this.bossTimer += dt;
    if (this.bossTimer >= CONFIG.BOSS_INTERVAL) {
      this.bossTimer = 0;
      this.spawnBoss();
    }

    // Update player
    this.player.update(dt, this.input);

    // Auto-attack: skills
    this.updateAttacks(dt);

    // Rebuild spatial grid (only alive enemies)
    this.grid.clear();
    for (const e of this.enemies) {
      if (e.alive) this.grid.insert(e);
    }

    // Update enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;

      // Handle frozen state (slow movement) + sword dance slow
      let speedMultiplier = 1;
      if (e.frozen) {
        e.freezeTimer -= dt;
        if (e.freezeTimer <= 0) {
          e.frozen = false;
        } else {
          speedMultiplier = 0.2; // -80% speed while frozen
        }
      }
      // Sword dance slow (叠加生效: 取最低速度)
      if (e.slowedBySwordDance) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) {
          e.slowedBySwordDance = false;
        } else {
          speedMultiplier = Math.min(speedMultiplier, e.slowFactor || 0.5);
        }
      }

      // Update enemy with speed modifier
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        e.x += (dx / dist) * e.speed * speedMultiplier * dt;
        e.y += (dy / dist) * e.speed * speedMultiplier * dt;
      }
      e.angle += dt * 2;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      // Collision with player — FIX: use CONFIG.PLAYER_SIZE (was this.player.size which was undefined)
      const distSq = dx * dx + dy * dy;
      const minDist = CONFIG.PLAYER_SIZE + e.size;
      if (distSq < minDist * minDist) {
        this.player.takeDamage(e.damage);
        this.audio.play('damage');
        if (this.player.alive) {
          this.particles.emit(this.player.x, this.player.y, 5, '#f44', { speed: 80, life: 0.3 });
          this.shake(3, 0.1);
        }
      }
    }

    // Boss attacks (heavenly_boss shoots swords and orbs at player)
    for (const e of this.enemies) {
      if (!e.alive || e.type !== 'heavenly_boss') continue;
      e.bossAttackTimer -= dt;
      if (e.bossAttackTimer <= 0) {
        e.bossAttackTimer = e.bossAttackInterval;
        const bdx = this.player.x - e.x;
        const bdy = this.player.y - e.y;
        const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
        if (bdist > 0) {
          // Fire a flying sword
          const swordSpeed = 250;
          const swordDmg = e.damage * 0.5;
          const sword = new Projectile(
            e.x, e.y,
            (bdx / bdist) * swordSpeed,
            (bdy / bdist) * swordSpeed,
            swordDmg, 10, '#ff4400', 'sword', 4
          );
          sword.target = this.player;
          this.enemyProjectiles.push(sword);

          // Fire an orb (fireball)
          const orbAngle = Math.atan2(bdy, bdx) + (Math.random() - 0.5) * 0.5;
          const orbSpeed = 180;
          const orbDmg = e.damage * 0.3;
          this.enemyProjectiles.push(new Projectile(
            e.x, e.y,
            Math.cos(orbAngle) * orbSpeed,
            Math.sin(orbAngle) * orbSpeed,
            orbDmg, 12, '#ff6600', 'fireball', 3
          ));

          this.audio.play('sword');
        }
      }
    }

    // Update projectiles
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.update(dt);

      // Hit enemies — use wider query for fireball to catch enemies before impact
      const queryRadius = p.type === 'fireball'
        ? Math.max(p.size + 15, (p.explosionRadius || 50))
        : p.size + 25; // wider query for sword to catch moving enemies
      const nearby = this.grid.query(p.x, p.y, queryRadius);
      for (const e of nearby) {
        if (!e.alive) continue;
        // Prevent same projectile hitting same enemy twice
        if (p.hitEnemies.has(e)) continue;

        const edx = e.x - p.x;
        const edy = e.y - p.y;
        if (edx * edx + edy * edy < (e.size + p.size) * (e.size + p.size)) {
          if (p.type === 'fireball') {
            // Fireball: only explode, don't do separate hit damage
            this.explosion(p.x, p.y, p.damage, p.explosionRadius || 50);
            p.hitEnemies.add(e);
          } else {
            e.takeDamage(p.damage);
            p.hitEnemies.add(e);
            this.audio.play('hit');
            this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, p.damage, '#ff0'));
            this.particles.emit(e.x, e.y, 3, p.color, { speed: 60, life: 0.2, size: 2 });
            if (!e.alive) this.onEnemyKill(e);
          }
          p.alive = false;
          break;
        }
      }
    }

    // Orbit swords collision (御剑术) - 百分比伤害 + 减速
    for (const os of this.player.orbitSwords) {
      const pos = os.getPosition(this.player.x, this.player.y);
      const nearby = this.grid.query(pos.x, pos.y, os.size + 15);
      for (const e of nearby) {
        if (!e.alive) continue;
        // 每帧伤害 (基于敌人最大HP百分比，每2%提升)
        const dmg = e.maxHp * os.hpPercentDmg * dt;
        e.hp -= dmg;
        if (e.hp <= 0) { e.hp = 0; e.alive = false; }
        e.hitFlash = 0.05;
        // 减速效果
        if (!e.slowedBySwordDance || e.slowTimer <= 0) {
          e.slowedBySwordDance = true;
          e.slowTimer = os.slowDuration;
          e.slowFactor = os.slowFactor;
        } else {
          e.slowTimer = Math.min(e.slowTimer + 0.5, os.slowDuration);
        }
      }
    }

    // Boomerang update + collision - 百分比伤害
    for (const b of this.boomerangs) {
      if (!b.alive) continue;
      b.update(dt, this.player.x, this.player.y);

      // Hit enemies (penetrates all)
      const nearby = this.grid.query(b.x, b.y, b.size + 15);
      for (const e of nearby) {
        if (!e.alive) continue;
        if (b.hitEnemies.has(e)) continue;
        const edx = e.x - b.x;
        const edy = e.y - b.y;
        if (edx * edx + edy * edy < (e.size + b.size) * (e.size + b.size)) {
          // 按敌人最大HP百分比伤害
          const dmg = Math.ceil(e.maxHp * b.hpPercentDmg);
          e.hp -= dmg;
          if (e.hp <= 0) { e.hp = 0; e.alive = false; }
          b.hitEnemies.add(e);
          e.hitFlash = 0.1;
          this.audio.play('hit');
          this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, dmg, '#ff8800'));
          this.particles.emit(e.x, e.y, 3, '#ff8800', { speed: 60, life: 0.2, size: 2 });
          if (!e.alive) this.onEnemyKill(e);
        }
      }
    }

    // Equipment pickup (player proximity)
    const pickupRadius = 40;
    for (const eq of this.groundEquipment) {
      if (!eq.alive) continue;
      const dx = this.player.x - eq.x;
      const dy = this.player.y - eq.y;
      if (dx * dx + dy * dy < pickupRadius * pickupRadius) {
        this.equipPickup(eq);
      }
    }

    // Update ground equipment
    for (const eq of this.groundEquipment) {
      if (eq.alive) eq.update(dt);
    }

    // Update frost nova effects
    for (const fn of this.frostNovaEffects) {
      fn.life -= dt;
    }
    this.frostNovaEffects = this.frostNovaEffects.filter(fn => fn.life > 0);

    // Update particles (in-place compaction)
    this.particles.update(dt);

    // Update damage numbers (in-place compaction)
    let dnWrite = 0;
    for (let dnRead = 0; dnRead < this.damageNumbers.length; dnRead++) {
      this.damageNumbers[dnRead].update(dt);
      if (this.damageNumbers[dnRead].alive) {
        if (dnWrite !== dnRead) this.damageNumbers[dnWrite] = this.damageNumbers[dnRead];
        dnWrite++;
      }
    }
    this.damageNumbers.length = dnWrite;
    // Hard cap to prevent memory explosion
    if (this.damageNumbers.length > CONFIG.MAX_DAMAGE_NUMBERS) {
      this.damageNumbers.splice(0, this.damageNumbers.length - CONFIG.MAX_DAMAGE_NUMBERS);
    }

    // Clean up dead objects (in-place compaction, no new array allocation)
    let eWrite = 0;
    for (let eRead = 0; eRead < this.enemies.length; eRead++) {
      if (this.enemies[eRead].alive) {
        if (eWrite !== eRead) this.enemies[eWrite] = this.enemies[eRead];
        eWrite++;
      }
    }
    this.enemies.length = eWrite;

    let pWrite = 0;
    for (let pRead = 0; pRead < this.projectiles.length; pRead++) {
      if (this.projectiles[pRead].alive) {
        if (pWrite !== pRead) this.projectiles[pWrite] = this.projectiles[pRead];
        pWrite++;
      }
    }
    const deadProj = this.projectiles.length - pWrite;
    this.projectiles.length = pWrite;

    // Boomerang cleanup
    let bWrite = 0;
    for (let bRead = 0; bRead < this.boomerangs.length; bRead++) {
      if (this.boomerangs[bRead].alive) {
        if (bWrite !== bRead) this.boomerangs[bWrite] = this.boomerangs[bRead];
        bWrite++;
      }
    }
    this.boomerangs.length = bWrite;

    // Update enemy projectiles
    for (const p of this.enemyProjectiles) {
      if (!p.alive) continue;
      p.update(dt);

      // Hit player
      if (this.player.alive) {
        const pdx = this.player.x - p.x;
        const pdy = this.player.y - p.y;
        if (pdx * pdx + pdy * pdy < (CONFIG.PLAYER_SIZE + p.size) * (CONFIG.PLAYER_SIZE + p.size)) {
          this.player.takeDamage(p.damage);
          this.audio.play('damage');
          this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 30, p.damage, '#ff4400'));
          this.particles.emit(this.player.x, this.player.y, 5, '#ff4400', { speed: 80, life: 0.3 });
          this.shake(3, 0.1);
          p.alive = false;
        }
      }

      // Out of bounds or expired
      if (p.x < -100 || p.x > CONFIG.WORLD_WIDTH + 100 || p.y < -100 || p.y > CONFIG.WORLD_HEIGHT + 100) {
        p.alive = false;
      }
    }

    // Enemy projectile cleanup
    let epWrite = 0;
    for (let epRead = 0; epRead < this.enemyProjectiles.length; epRead++) {
      if (this.enemyProjectiles[epRead].alive) {
        if (epWrite !== epRead) this.enemyProjectiles[epWrite] = this.enemyProjectiles[epRead];
        epWrite++;
      }
    }
    this.enemyProjectiles.length = epWrite;

    // Ground equipment cleanup (max 20 on ground for performance)
    let geWrite = 0;
    for (let geRead = 0; geRead < this.groundEquipment.length; geRead++) {
      if (this.groundEquipment[geRead].alive && geWrite < 20) {
        if (geWrite !== geRead) this.groundEquipment[geWrite] = this.groundEquipment[geRead];
        geWrite++;
      }
    }
    this.groundEquipment.length = geWrite;
    // Camera smoothing (was instant snap → jittery)
    this.targetCamX = this.player.x - this.canvas.width / 2;
    this.targetCamY = this.player.y - this.canvas.height / 2;
    this.camX += (this.targetCamX - this.camX) * CONFIG.CAMERA_SMOOTH;
    this.camY += (this.targetCamY - this.camY) * CONFIG.CAMERA_SMOOTH;

    // Screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= 0.9;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Breakthrough effect
    if (this.breakthroughEffect > 0) {
      this.breakthroughEffect -= dt;
    }

    // 大招全屏特效计时器 (渐弱消退)
    if (this.ultimateEffectTimer > 0) {
      this.ultimateEffectTimer -= dt;
      // 闪电链渐弱 (同步消退)
      for (const bolt of this.ultimateLightningBolts) {
        bolt.life = Math.max(0, this.ultimateEffectTimer / 1.0 * bolt.maxLife);
      }
    }
    // 大招文字特效计时器 (渐弱消退)
    if (this.ultimateTextTimer > 0) {
      this.ultimateTextTimer -= dt;
    }

    // Check game over
    if (!this.player.alive) {
      this.gameOver();
    }
  }

  updateAttacks(dt) {
    const p = this.player;

    // Basic flying swords
    if (p.skills.flying_sword) {
      const def = SKILL_DEFS[0];
      const eff = def.effect(p.skills.flying_sword);
      if (!p.skillCooldowns.flying_sword) p.skillCooldowns.flying_sword = 0;
      p.skillCooldowns.flying_sword -= dt;
      if (p.skillCooldowns.flying_sword <= 0) {
        p.skillCooldowns.flying_sword = eff.cooldown;
        const target = this.findNearestEnemy(p.x, p.y, eff.range);
        if (target) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          for (let i = 0; i < eff.count; i++) {
            const angle = Math.atan2(dy, dx) + (i - (eff.count - 1) / 2) * 0.2;
            // Apply skill damage bonus (scales with player level)
            const swordDmg = (eff.damage + p.damage * 0.5) * (1 + p.skillDamageBonus);
            const proj = new Projectile(
              p.x, p.y,
              Math.cos(angle) * CONFIG.FLYING_SWORD_SPEED,
              Math.sin(angle) * CONFIG.FLYING_SWORD_SPEED,
              swordDmg,
              8, '#8cf', 'sword', 2 // size 6→8 for better collision
            );
            proj.target = target; // enable homing toward target
            this.projectiles.push(proj);
          }
          this.audio.play('sword');
        }
      }
    }

    // Sword aura - 按敌人最大HP百分比扣血
    if (p.skills.sword_aura) {
      const def = SKILL_DEFS[1];
      const eff = def.effect(p.skills.sword_aura);
      if (!p.skillCooldowns.sword_aura) p.skillCooldowns.sword_aura = 0;
      p.skillCooldowns.sword_aura -= dt;
      if (p.skillCooldowns.sword_aura <= 0) {
        p.skillCooldowns.sword_aura = eff.cooldown;
        const enemies = this.grid.query(p.x, p.y, eff.radius);
        for (const e of enemies) {
          if (!e.alive) continue;
          // 按最大HP百分比扣血，每级提升0.5% (Lv1=5%, Lv10=9.5%)
          const percentDmg = eff.hpPercentDmg * e.maxHp;
          const actualDmg = Math.ceil(percentDmg);
          e.hp -= actualDmg;
          if (e.hp <= 0) { e.hp = 0; e.alive = false; }
          e.hitFlash = 0.1;
          this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, actualDmg, '#0ff'));
          this.particles.emit(e.x, e.y, 3, '#0ff', { speed: 50, life: 0.3, size: 2 });
          if (!e.alive) this.onEnemyKill(e);
        }
        this.particles.emit(p.x, p.y, 15, '#0ff', { speed: 200, life: 0.5, size: 4 });
        this.audio.play('hit');
      }
    }

    // Lightning - 随机小范围AoE，造成50%~90%最大HP伤害
    if (p.skills.lightning) {
      const def = SKILL_DEFS[2];
      const eff = def.effect(p.skills.lightning);
      if (!p.skillCooldowns.lightning) p.skillCooldowns.lightning = 0;
      p.skillCooldowns.lightning -= dt;
      if (p.skillCooldowns.lightning <= 0) {
        p.skillCooldowns.lightning = eff.cooldown;
        // 在玩家附近随机位置释放天雷，造成10%~30%最大HP伤害
        const enemiesNearPlayer = this.grid.query(p.x, p.y, eff.strikeRadius);
        if (enemiesNearPlayer.length === 0) return;

        for (let i = 0; i < eff.count; i++) {
          // 在玩家附近随机选一个雷击点
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * eff.strikeRadius;
          const strikeX = p.x + Math.cos(angle) * dist;
          const strikeY = p.y + Math.sin(angle) * dist;

          const enemiesInArea = this.grid.query(strikeX, strikeY, eff.areaRadius);
          const hitTargets = new Set();
          for (const e of enemiesInArea) {
            if (!e.alive || hitTargets.has(e)) continue;
            hitTargets.add(e);
            // 随机HP百分比伤害 10%~30%
            const hpPercent = eff.minHpPercent + Math.random() * (eff.maxHpPercent - eff.minHpPercent);
            const lightDmg = Math.ceil(e.maxHp * hpPercent);
            e.hp -= lightDmg;
            if (e.hp <= 0) { e.hp = 0; e.alive = false; }
            e.hitFlash = 0.1;
            this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, lightDmg, '#ff0'));
            this.particles.emit(e.x, e.y, 8, '#ff0', { speed: 100, life: 0.4, size: 3, type: 'lightning' });
            if (!e.alive) this.onEnemyKill(e);
          }
          // 雷击视觉：从天劈下
          this.particles.emitLine(strikeX, 0, strikeX, strikeY, '#ff0', 8, 0.3, 3);
          this.particles.emit(strikeX, strikeY, 5, '#fff', { speed: 60, life: 0.2, size: 2 });
        }
        this.audio.play('lightning');
        this.shake(5, 0.15);
      }
    }

    // Shield
    if (p.skills.shield) {
      const def = SKILL_DEFS[3];
      const eff = def.effect(p.skills.shield);
      if (!p.skillCooldowns.shield) p.skillCooldowns.shield = 0;
      p.skillCooldowns.shield -= dt;
      if (p.skillCooldowns.shield <= 0 && !p.shieldActive) {
        p.skillCooldowns.shield = eff.cooldown;
        p.shieldActive = true;
        p.shieldTimer = eff.duration;
        p.shieldReduction = eff.reduction;
        this.particles.emit(p.x, p.y, 20, '#88f', { speed: 100, life: 0.5, size: 4 });
      }
    }

    // Fireball
    if (p.skills.fireball) {
      const def = SKILL_DEFS[4];
      const eff = def.effect(p.skills.fireball);
      if (!p.skillCooldowns.fireball) p.skillCooldowns.fireball = 0;
      p.skillCooldowns.fireball -= dt;
      if (p.skillCooldowns.fireball <= 0) {
        p.skillCooldowns.fireball = eff.cooldown;
        const target = this.findNearestEnemy(p.x, p.y, 600);
        if (target) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // FIX: pass explosionRadius in constructor instead of setting after
          // Apply skill damage bonus
          const fireDmg = eff.damage * (1 + p.skillDamageBonus);
          const proj = new Projectile(
            p.x, p.y,
            (dx / dist) * eff.speed, (dy / dist) * eff.speed,
            fireDmg, 10, '#f60', 'fireball', 3
          );
          proj.explosionRadius = eff.explosionRadius;
          this.projectiles.push(proj);
          this.audio.play('fire');
        }
      }
    }

    // Sword dance (orbit swords) - 百分比伤害 + 减速
    if (p.skills.sword_dance) {
      const def = SKILL_DEFS[5];
      const eff = def.effect(p.skills.sword_dance);
      if (p.orbitSwords.length === 0) {
        const totalSwords = CONFIG.BASE_FLYING_SWORD_COUNT + eff.extraSwords;
        for (let i = 0; i < totalSwords; i++) {
          p.orbitSwords.push(new OrbitSword(
            (Math.PI * 2 / totalSwords) * i,
            eff.orbitRadius,
            eff.hpPercentDmg,
            8, '#aaf',
            eff.slowFactor,
            eff.slowDuration,
          ));
        }
      }
      for (const os of p.orbitSwords) {
        os.radius = eff.orbitRadius;
        os.hpPercentDmg = eff.hpPercentDmg;
        os.slowFactor = eff.slowFactor;
        os.slowDuration = eff.slowDuration;
        os.update(dt, eff.rotationSpeed);
      }
    }

    // Spirit burst (灵力爆发) - 范围伤害，越近伤害越高
    if (p.skills.spirit_burst) {
      const def = SKILL_DEFS[6];
      const eff = def.effect(p.skills.spirit_burst);
      if (!p.skillCooldowns.spirit_burst) p.skillCooldowns.spirit_burst = 0;
      p.skillCooldowns.spirit_burst -= dt;
      if (p.skillCooldowns.spirit_burst <= 0) {
        p.skillCooldowns.spirit_burst = eff.cooldown;
        const enemiesInRange = this.grid.query(p.x, p.y, eff.radius);
        for (const e of enemiesInRange) {
          if (!e.alive) continue;
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // 距离衰减: 最近30%最大HP, 边缘10%最大HP
          const ratio = 1 - dist / eff.radius;
          const hpPercent = eff.minHpPercent + (eff.maxHpPercent - eff.minHpPercent) * ratio;
          const burstDmg = Math.ceil(e.maxHp * hpPercent);
          e.hp -= burstDmg;
          if (e.hp <= 0) { e.hp = 0; e.alive = false; }
          e.hitFlash = 0.1;
          this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, burstDmg, '#f8f'));
          if (!e.alive) this.onEnemyKill(e);
        }
        this.particles.emit(p.x, p.y, 30, '#f8f', { speed: 300, life: 0.8, size: 5 });
        this.audio.play('burst');
      }
    }

    // Boomerang (回旋镖) — SKILL_DEFS[8]
    if (p.skills.boomerang) {
      const def = SKILL_DEFS[8];
      const eff = def.effect(p.skills.boomerang);
      if (!p.skillCooldowns.boomerang) p.skillCooldowns.boomerang = 0;
      p.skillCooldowns.boomerang -= dt;
      if (p.skillCooldowns.boomerang <= 0) {
        p.skillCooldowns.boomerang = eff.cooldown;
        // Fire boomerangs in different directions
        const target = this.findNearestEnemy(p.x, p.y, 800);
        const baseAngle = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.random() * Math.PI * 2;
        for (let i = 0; i < eff.count; i++) {
          const angle = baseAngle + (i - (eff.count - 1) / 2) * 0.5;
          this.boomerangs.push(new Boomerang(p.x, p.y, angle, eff.hpPercentDmg, eff.size, eff.maxDistance, eff.speed));
        }
        this.audio.play('sword');
      }
    }

    // Frost Nova (冰冻新星) — SKILL_DEFS[9]
    if (p.skills.frost_nova) {
      const def = SKILL_DEFS[9];
      const eff = def.effect(p.skills.frost_nova);
      if (!p.skillCooldowns.frost_nova) p.skillCooldowns.frost_nova = 0;
      p.skillCooldowns.frost_nova -= dt;
      if (p.skillCooldowns.frost_nova <= 0) {
        p.skillCooldowns.frost_nova = eff.cooldown;
        const enemiesInRange = this.grid.query(p.x, p.y, eff.radius);
        for (const e of enemiesInRange) {
          if (!e.alive) continue;
          // 随机HP百分比伤害 (1%~5% 随等级提升)
          const hpPercent = eff.minHpPercent + Math.random() * (eff.maxHpPercent - eff.minHpPercent);
          const frostDmg = Math.ceil(e.maxHp * hpPercent);
          e.hp -= frostDmg;
          if (e.hp <= 0) { e.hp = 0; e.alive = false; }
          // 冻结/减速
          e.frozen = true;
          e.freezeTimer = eff.freezeDuration;
          this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, frostDmg, '#88ddff'));
          if (!e.alive) this.onEnemyKill(e);
        }
        // Visual: ice explosion particles
        this.particles.emit(p.x, p.y, 25, '#88ddff', { speed: 200, life: 0.6, size: 4 });
        this.particles.emit(p.x, p.y, 15, '#ffffff', { speed: 100, life: 0.4, size: 3 });
        // Store frost nova effect for rendering
        this.frostNovaEffects.push({
          x: p.x, y: p.y,
          radius: eff.radius,
          life: 0.5,
          maxLife: 0.5,
        });
        this.audio.play('hit');
        this.shake(3, 0.1);
      }
    }
  }

  explosion(x, y, damage, radius) {
    // FIX: was typo 'this.exlosion' → method not found
    // Apply skill damage bonus to explosion damage
    const bonusDmg = damage * (1 + this.player.skillDamageBonus);
    const enemies = this.grid.query(x, y, radius);
    const alreadyHit = new Set();
    for (const e of enemies) {
      if (e.alive && !alreadyHit.has(e)) {
        e.takeDamage(bonusDmg);
        this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, bonusDmg, '#f80'));
        alreadyHit.add(e);
        if (!e.alive) this.onEnemyKill(e);
      }
    }
    // Visual — layered explosion
    this.particles.emit(x, y, 20, '#f80', { speed: 200, life: 0.6, size: 6 });
    this.particles.emit(x, y, 10, '#ff0', { speed: 150, life: 0.4, size: 4 });
    // Explosion ring visual via particles
    this.particles.emit(x, y, 12, '#ff4500', { speed: radius * 1.5, life: 0.3, size: 3 });
    this.shake(4, 0.15);
    this.audio.play('fire');
  }

  findNearestEnemy(x, y, range) {
    let nearest = null;
    let nearestDistSq = range * range;
    const candidates = this.grid.query(x, y, range);
    for (const e of candidates) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = e;
      }
    }
    return nearest;
  }

  spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const margin = 50;
    switch (edge) {
      case 0: x = this.player.x + (Math.random() - 0.5) * this.canvas.width; y = -margin; break;
      case 1: x = this.player.x + (Math.random() - 0.5) * this.canvas.width; y = CONFIG.WORLD_HEIGHT + margin; break;
      case 2: x = -margin; y = this.player.y + (Math.random() - 0.5) * this.canvas.height; break;
      case 3: x = CONFIG.WORLD_WIDTH + margin; y = this.player.y + (Math.random() - 0.5) * this.canvas.height; break;
    }
    x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH, x));
    y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT, y));

    // 根据玩家境界选择敌人类型
    const realmIndex = Math.min(this.player.realmIndex, 14);
    const availableTypes = REALM_ENEMIES[realmIndex] || ['minion', 'beast'];
    // 低概率刷高级敌人 (最高 tier 敌人)
    const r = Math.random();
    let typeIndex;
    if (r < 0.1 && availableTypes.length >= 3) {
      // 10% 几率刷最强敌人
      typeIndex = availableTypes.length - 1;
    } else if (r < 0.4 && availableTypes.length >= 2) {
      // 30% 几率刷中级敌人
      typeIndex = Math.min(1, availableTypes.length - 1);
    } else {
      // 60% 几率刷基础敌人
      typeIndex = 0;
    }
    const type = availableTypes[typeIndex];

    // 敌人属性随人物等级提升: 每级 +6% 属性, 每境界额外 +10%
    const playerLevel = this.player.level;
    const levelScale = 1 + playerLevel * 0.06 + realmIndex * 0.1;

    this.enemies.push(new Enemy(type, x, y, this.difficultyMult * levelScale));
  }

  spawnBoss() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch (edge) {
      case 0: x = this.player.x + (Math.random() - 0.5) * 600; y = -50; break;
      case 1: x = this.player.x + (Math.random() - 0.5) * 600; y = CONFIG.WORLD_HEIGHT + 50; break;
      case 2: x = -50; y = this.player.y + (Math.random() - 0.5) * 600; break;
      case 3: x = CONFIG.WORLD_WIDTH + 50; y = this.player.y + (Math.random() - 0.5) * 600; break;
    }
    x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH, x));
    y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT, y));

    // 根据玩家境界选择Boss类型
    const realmIndex = Math.min(this.player.realmIndex, 14);
    const playerLevel = this.player.level;
    const levelScale = 1 + playerLevel * 0.1 + realmIndex * 0.2;

    // 每5级出现天劫Boss (免疫天劫，会发射飞剑和光球)
    if (playerLevel > 0 && playerLevel % 5 === 0) {
      const heavenlyBossDef = ENEMY_TYPES.heavenly_boss;
      const hpScale = 1 + playerLevel * 0.3 + realmIndex * 0.5;
      const heavenlyBoss = new Enemy('heavenly_boss', x, y, this.difficultyMult * hpScale);
      this.enemies.push(heavenlyBoss);
      this.shake(10, 0.4);
      this.particles.emit(heavenlyBoss.x, heavenlyBoss.y, 40, '#ff2200', { speed: 180, life: 1.2, size: 6 });
      this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 80, '⚠ 天劫之主降临!', '#ff2200'));
      return;
    }

    let bossType = 'boss';
    if (realmIndex >= 14) bossType = 'daluo_immortal';
    else if (realmIndex >= 13) bossType = 'taiyi_immortal';
    else if (realmIndex >= 12) bossType = 'golden_immortal';
    else if (realmIndex >= 11) bossType = 'celestial';
    else if (realmIndex >= 9) bossType = 'earth_deity';
    else if (realmIndex >= 8) bossType = 'immortal_guardian';
    else if (realmIndex >= 7) bossType = 'void_cultivator';
    else if (realmIndex >= 6) bossType = 'heavenly_demon';
    else if (realmIndex >= 5) bossType = 'ancient_beast';
    else if (realmIndex >= 4) bossType = 'demon_cultivator';

    const boss = new Enemy(bossType, x, y, this.difficultyMult * levelScale);
    this.enemies.push(boss);

    this.shake(8, 0.3);
    this.particles.emit(boss.x, boss.y, 30, '#ffd700', { speed: 150, life: 1, size: 5 });
  }

  onEnemyKill(enemy) {
    this.player.kills++;
    // 大招充能: 每击杀 10 个敌人充能一次 (Boss 也算)
    if (!this.player.ultimateReady) {
      this.player.ultimateCharge++;
      if (this.player.ultimateCharge >= 10) {
        this.player.ultimateCharge = 10;
        this.player.ultimateReady = true;
      }
    }

    // Equipment drop check
    const dropChance = this.getEquipmentDropChance(enemy.type);
    if (Math.random() < dropChance) {
      this.spawnEquipmentDrop(enemy.x, enemy.y, enemy.type);
    }

    const xpGain = enemy.xp * (1 + this.player.xpBonus);
    const result = this.player.addXP(xpGain);

    // Death particles
    this.particles.emit(enemy.x, enemy.y, 8, enemy.color, { speed: 100, life: 0.4, size: 3 });

    if (result.leveled) {
      this.audio.play('levelup');
      this.particles.emit(this.player.x, this.player.y, 30, '#ffd700', { speed: 200, life: 0.8, size: 5 });

      if (result.breakthrough) {
        this.audio.play('breakthrough');
        this.breakthroughEffect = 1.5;
        this.player.invincible = true;
        this.player.invincibleTimer = 3;
        this.player.hp = this.player.maxHp;

        for (const e of this.enemies) {
          if (e.alive) {
            this.particles.emit(e.x, e.y, 5, e.color, { speed: 80, life: 0.3, size: 2 });
            e.alive = false;
            this.player.kills++;
          }
        }

        this.shake(10, 0.5);
      }

      this.showSkillSelection(result.breakthrough);
    } else {
      this.audio.play('kill');
    }
  }

  showSkillSelection(isBreakthrough) {
    this.state = 'skillSelect';

    const overlay = document.getElementById('skillOverlay');
    const cardsDiv = document.getElementById('skillCards');
    const levelText = document.getElementById('levelText');

    const realm = REALMS[this.player.realmIndex];
    levelText.textContent = `等级 ${this.player.level} · ${realm.name}`;
    if (isBreakthrough) {
      levelText.textContent += ' ⚡ 突破境界! ⚡';
      levelText.style.color = '#ffd700';
    } else {
      levelText.style.color = '#aaa';
    }

    const available = SKILL_DEFS.filter(s => {
      const currentLevel = this.player.skills[s.id] || 0;
      return currentLevel < s.maxLevel;
    });

    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(3, shuffled.length));

    cardsDiv.innerHTML = '';
    for (const skill of selected) {
      const currentLevel = this.player.skills[skill.id] || 0;
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.innerHTML = `
        <div class="icon">${skill.icon}</div>
        <div class="name">${skill.name}</div>
        <div class="desc">${skill.desc}</div>
        <div class="level">${currentLevel === 0 ? '未习得' : '当前等级: ' + '⭐'.repeat(currentLevel)}</div>
      `;
      card.addEventListener('click', () => {
        this.selectSkill(skill);
      });
      cardsDiv.appendChild(card);
    }

    overlay.classList.add('active');
  }

  selectSkill(skill) {
    this.audio.play('select');
    if (!this.player.skills[skill.id]) {
      this.player.skills[skill.id] = 0;
    }
    this.player.skills[skill.id]++;

    // Reset orbit swords if sword_dance upgraded
    if (skill.id === 'sword_dance') {
      this.player.orbitSwords = [];
    }

    document.getElementById('skillOverlay').classList.remove('active');
    this.state = 'playing';
  }

  /** Calculate equipment drop chance based on enemy type and player luck */
  getEquipmentDropChance(enemyType) {
    let baseChance = 0;
    switch (enemyType) {
      case 'minion': baseChance = 0.15; break;
      case 'beast': baseChance = 0.15; break;
      case 'elite': baseChance = 0.40; break;
      case 'boss': baseChance = 1.0; break;
      default: baseChance = 0.15;
    }
    // Apply player luck bonus
    const luckMultiplier = 1 + this.player.dropRateBonus;
    return baseChance * luckMultiplier;
  }

  /** Spawn equipment on the ground where an enemy died */
  spawnEquipmentDrop(x, y, enemyType) {
    if (this.groundEquipment.length >= 20) return; // Cap for performance

    let count = 1;
    if (enemyType === 'boss') {
      count = Math.random() < 0.5 ? 2 : 1; // 50% chance for 2 drops from boss
    }

    for (let i = 0; i < count; i++) {
      if (this.groundEquipment.length >= 20) break;
      // Random equipment type
      const typeIndex = Math.floor(Math.random() * EQUIPMENT_TYPES.length);
      // Offset position slightly for multiple drops
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      this.groundEquipment.push(new GroundEquipment(typeIndex, x + offsetX, y + offsetY));
    }
  }

  /** Pick up equipment and apply permanent bonuses */
  equipPickup(eq) {
    eq.alive = false;
    const p = this.player;
    const def = eq.def;
    const value = def.value;

    // Apply permanent bonus
    switch (def.effect) {
      case 'attack':
        p.attackBonus += value;
        break;
      case 'maxHp':
        p.maxHp += value;
        p.hp = Math.min(p.hp + value, p.maxHp);
        break;
      case 'speed':
        p.speedBonus = (p.speedBonus || 0) + value;
        break;
      case 'defense':
        p.defenseReduction = Math.max(0.5, p.defenseReduction - value);
        break;
      case 'xpBonus':
        p.xpBonus = (p.xpBonus || 0) + value;
        break;
      case 'dropRate':
        p.dropRateBonus = (p.dropRateBonus || 0) + value;
        break;
      case 'revive':
        p.reviveTokens = (p.reviveTokens || 0) + 1;
        break;
      case 'skillPack':
        this.applySkillPack();
        break;
    }

    // Pickup particles
    this.particles.emit(eq.x, eq.y, 12, def.color, { speed: 80, life: 0.5, size: 3 });

    // Floating text
    this.damageNumbers.push(new DamageNumber(eq.x, eq.y - 20, def.name, def.color));

    this.audio.play('select');
  }

  /** Apply skill pack: randomly upgrade one learned skill */
  applySkillPack() {
    const p = this.player;
    const learnedSkills = Object.keys(p.skills).filter(id => p.skills[id] > 0 && p.skills[id] < SKILL_DEFS.find(s => s.id === id)?.maxLevel);
    if (learnedSkills.length === 0) {
      // 所有技能已满, 返还随机符文
      this.damageNumbers.push(new DamageNumber(p.x, p.y - 40, '技能已满! 获得随机符文', '#ffdd00'));
      const typeIndex = Math.floor(Math.random() * 6); // 6种基础符文
      this.groundEquipment.push(new GroundEquipment(typeIndex, p.x + 20, p.y));
      return;
    }
    const randomSkill = learnedSkills[Math.floor(Math.random() * learnedSkills.length)];
    p.skills[randomSkill]++;
    const skillName = SKILL_DEFS.find(s => s.id === randomSkill)?.name || randomSkill;
    this.damageNumbers.push(new DamageNumber(p.x, p.y - 40, `${skillName} +1`, '#44ddff'));
    this.particles.emit(p.x, p.y, 20, '#44ddff', { speed: 120, life: 0.6, size: 4 });
    this.audio.play('levelup');
  }

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  // ============ 大招: 天劫降临 ============
  /**
   * 释放大招 — 天劫降临:
   * - 5% 几率: 全屏所有敌人即刻死亡 (红色爆炸粒子 + 红色光柱)
   * - 95% 几率: 对全屏所有敌人造成 80% 最大 HP 伤害 (黄色伤害数字)
   * - 全屏闪电链特效 + 白屏闪光 + 屏幕震动 + 天劫文字特效 + 雷鸣音效
   */
  activateUltimate() {
    const p = this.player;
    if (!p.ultimateReady) return;

    // 重置充能状态 (释放后需要重新充能 10 杀)
    p.ultimateReady = false;
    p.ultimateCharge = 0;

    const aliveEnemies = this.enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0) {
      // 屏幕上没有敌人也要有音效和特效
      this.audio.play('ultimate');
      this.shake(10, 0.3);
      this.ultimateFlashAlpha = 0.6;
      this.ultimateEffectTimer = 0.8;
      this.ultimateTextTimer = 1.5;
      return;
    }

    // 5% 几率即刻死亡 / 95% 几率 80% 最大 HP 伤害 (每释放独立判定)
    const instantKill = Math.random() < 0.05;

    // 播放天劫音效 (震撼的雷鸣/天劫之声)
    this.audio.play('ultimate');

    // 白屏闪光 — 全屏亮白瞬间照亮整个战场然后渐弱 (约 0.5 秒内消退)
    this.ultimateFlashAlpha = 0.7;
    this.ultimateEffectTimer = 1.0;    // 闪电链显示 1 秒后消退 (渐弱)
    this.ultimateTextTimer = 2.0;       // "天劫降临" 文字显示 2 秒后消退 (渐弱)
    this.shake(15, 0.5);                // 强烈屏幕震动 (持续 0.5 秒)

    // 生成闪电链: 从玩家位置辐射到多个敌人 + 敌人之间相互连接 (模拟天劫雷电)
    this.ultimateLightningBolts = [];

    // 玩家到前 5 个敌人的闪电 (天劫降临 — 从玩家处释放)
    for (let i = 0; i < Math.min(5, aliveEnemies.length); i++) {
      const target = aliveEnemies[i];
      this.ultimateLightningBolts.push({
        x1: p.x, y1: p.y,
        x2: target.x, y2: target.y,
        life: 0.6,
        maxLife: 0.6,
        color: '#88aaff',  // 蓝色闪电 (天劫之雷)
      });
    }

    // 敌人之间的闪电链 (随机连接)
    const shuffled = [...aliveEnemies].sort(() => Math.random() - 0.5);
    const boltColor = instantKill ? '#ff4444' : '#ffdd00';
    for (let i = 0; i < shuffled.length - 1; i++) {
      this.ultimateLightningBolts.push({
        x1: shuffled[i].x, y1: shuffled[i].y,
        x2: shuffled[i + 1].x, y2: shuffled[i + 1].y,
        life: 0.8,
        maxLife: 0.8,
        color: boltColor,  // 红色 (秒杀) 或黄色 (伤害)
      });
    }

    // 应用大招效果 + 生成粒子特效 (每个敌人的独立特效)
    for (const e of aliveEnemies) {
      // 天劫Boss免疫天劫
      if (e.immuneToUltimate) {
        this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, '免疫!', '#ff2200'));
        continue;
      }
      if (instantKill) {
        // === 即刻死亡 ===
        e.alive = false;

        // 红色爆炸粒子 (爆炸效果)
        this.particles.emit(e.x, e.y, 15, '#ff2222', { speed: 200, life: 0.6, size: 4 });
        this.particles.emit(e.x, e.y, 8, '#ff6644', { speed: 150, life: 0.4, size: 3 });

        // 红色光柱效果 (垂直向上的粒子束 — 模拟天劫光柱击中)
        for (let j = 0; j < 6; j++) {
          if (this.particles.particles.length >= this.particles.max) this.particles.particles.shift();
          this.particles.particles.push(new Particle(
            e.x, e.y,
            (Math.random() - 0.5) * 10,   // 微小水平随机偏移 (更自然)
            -200 - Math.random() * 300,    // 高速向上 (模拟光柱从地上升起)
            0.5 + Math.random() * 0.3,
            '#ff4444',
            2 + Math.random() * 2,
            'lightning'
          ));
        }

        // 红色伤害数字 (显示秒杀 — 使用最大 HP 值)
        this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, e.maxHp, '#ff4444'));
      } else {
        // === 80% 最大 HP 伤害 ===
        const dmg = e.maxHp * 0.8;
        e.takeDamage(dmg);

        // 黄色伤害数字 (高亮醒目)
        this.damageNumbers.push(new DamageNumber(e.x, e.y - e.size, dmg, '#ffdd00'));

        // 黄色闪电粒子 (天劫击中特效)
        this.particles.emit(e.x, e.y, 8, '#ffdd00', { speed: 100, life: 0.4, size: 3 });

        // 如果伤害导致死亡 (边缘情况: 已经残血的敌人)
        if (!e.alive) this.onEnemyKill(e);
      }
    }

  }

  gameOver() {
    const p = this.player;
    // 有复活道具则原地复活
    if (p.reviveTokens > 0) {
      p.reviveTokens--;
      p.alive = true;
      p.hp = p.maxHp;
      p.invincible = true;
      p.invincibleTimer = 3;
      this.particles.emit(p.x, p.y, 40, '#ff4488', { speed: 200, life: 1.0, size: 6 });
      this.particles.emit(p.x, p.y, 20, '#ffdd00', { speed: 150, life: 0.8, size: 4 });
      this.shake(8, 0.3);
      this.damageNumbers.push(new DamageNumber(p.x, p.y - 30, '原地复活!', '#ff4488'));
      this.audio.play('breakthrough');
      return;
    }

    this.state = 'gameOver';
    this.audio.play('gameover');

    const score = this.calculateScore();
    this.saveScore(score);

    const overlay = document.getElementById('gameOverOverlay');
    const statsDiv = document.getElementById('finalStats');
    const realm = REALMS[this.player.realmIndex];

    statsDiv.innerHTML = `
      <span class="label">存活时间:</span><span class="value">${this.formatTime(this.gameTime)}</span>
      <span class="label">击杀数:</span><span class="value">${this.player.kills}</span>
      <span class="label">境界:</span><span class="value" style="color:${realm.color}">${realm.name}</span>
      <span class="label">等级:</span><span class="value">${this.player.level}</span>
      <span class="label">最终得分:</span><span class="value" style="color:#ffd700;font-size:1.3em">${score}</span>
      <span class="label">复活剩余:</span><span class="value" style="color:#ff4488">${this.player.reviveTokens}</span>
    `;

    this.showLeaderboard();
    overlay.classList.add('active');
  }

  calculateScore() {
    const timeScore = Math.floor(this.gameTime * 10);
    const killScore = this.player.kills * 50;
    const realmScore = (this.player.realmIndex + 1) * 500;
    const levelScore = this.player.level * 100;
    return timeScore + killScore + realmScore + levelScore;
  }

  saveScore(score) {
    let scores = JSON.parse(localStorage.getItem('cultivation_scores') || '[]');
    scores.push({
      score,
      time: this.formatTime(this.gameTime),
      kills: this.player.kills,
      realm: REALMS[this.player.realmIndex].name,
      level: this.player.level,
      date: new Date().toLocaleDateString('zh-CN'),
    });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem('cultivation_scores', JSON.stringify(scores));
  }

  showLeaderboard() {
    const lbDiv = document.getElementById('leaderboard');
    const scores = JSON.parse(localStorage.getItem('cultivation_scores') || '[]');

    if (scores.length === 0) {
      lbDiv.innerHTML = '<h3>📜 排行榜</h3><p style="color:#888;text-align:center">暂无记录</p>';
      return;
    }

    let html = '<h3>📜 排行榜 Top 10</h3><table>';
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      html += `<tr>
        <td class="rank">${i + 1}</td>
        <td>${s.realm} Lv.${s.level}</td>
        <td>${s.time} | ${s.kills}杀</td>
        <td class="lb-score">${s.score}</td>
      </tr>`;
    }
    html += '</table>';
    lbDiv.innerHTML = html;
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // ============ 渲染 ============
  render(dt) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    this.renderBackground(ctx, w, h);

    if (this.state === 'start') return;
    if (!this.player) return;

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Grid pattern
    this.renderGrid(ctx, w, h);

    // Stars
    this.renderStars(ctx);

    // Enemies
    for (const e of this.enemies) {
      if (e.alive) e.render(ctx, this.camX, this.camY);
    }

    // Projectiles
    for (const p of this.projectiles) {
      if (p.alive) p.render(ctx, this.camX, this.camY);
    }

    // Enemy projectiles (boss swords and orbs)
    for (const p of this.enemyProjectiles) {
      if (p.alive) p.render(ctx, this.camX, this.camY);
    }

    // Player
    if (this.player.alive || this.breakthroughEffect > 0) {
      this.player.render(ctx, this.camX, this.camY);
    }

    // Boomerangs visual
    for (const b of this.boomerangs) {
      if (b.alive) b.render(ctx, this.camX, this.camY);
    }

    // Ground equipment visual
    for (const eq of this.groundEquipment) {
      if (eq.alive) eq.render(ctx, this.camX, this.camY);
    }

    // Frost nova effect visual (expanding ice ring)
    for (const fn of this.frostNovaEffects) {
      const alpha = fn.life / fn.maxLife;
      const sx = fn.x - this.camX;
      const sy = fn.y - this.camY;
      // Expanding ring
      const progress = 1 - alpha;
      const currentRadius = fn.radius * (0.5 + progress * 0.5);
      ctx.strokeStyle = `rgba(136,221,255,${alpha * 0.6})`;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      // Inner fill
      ctx.fillStyle = `rgba(136,221,255,${alpha * 0.1})`;
      ctx.beginPath();
      ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Orbit swords visual
    for (const os of this.player.orbitSwords) {
      const pos = os.getPosition(this.player.x, this.player.y);
      const sx = pos.x - this.camX;
      const sy = pos.y - this.camY;
      ctx.save();
      ctx.translate(sx, sy);
      // FIX: proper rotation along orbital tangent direction
      ctx.rotate(os.angle + os.rotation + Math.PI / 2);
      ctx.fillStyle = os.color;
      ctx.shadowColor = os.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Particles
    this.particles.render(ctx, this.camX, this.camY);

    // Damage numbers
    for (const dn of this.damageNumbers) {
      dn.render(ctx, this.camX, this.camY);
    }

    // 大招全屏闪电特效 (闪电链 + 白屏闪光)
    if (this.ultimateEffectTimer > 0) {
      // 渲染闪电链 (每个闪电有锯齿效果)
      for (const bolt of this.ultimateLightningBolts) {
        const alpha = bolt.life / bolt.maxLife;
        this.renderLightningBolt(ctx, bolt.x1, bolt.y1, bolt.x2, bolt.y2, alpha, bolt.color);
      }

      // 全屏白闪 (释放瞬间照亮整个屏幕, 渐弱)
      if (this.ultimateFlashAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this.ultimateFlashAlpha})`;
        ctx.fillRect(0, 0, w, h);
        this.ultimateFlashAlpha -= dt * 1.5;
      }
    }

    // 大招文字特效: "天劫降临" (金色大字, 释放瞬间放大, 渐出)
    if (this.ultimateTextTimer > 0) {
      const textAlpha = Math.min(1, this.ultimateTextTimer / 0.5);
      const textScale = this.ultimateTextTimer > 1.5 ? 1 + (this.ultimateTextTimer - 1.5) * 2 : 1;
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.translate(w / 2, h * 0.35);
      ctx.scale(textScale, textScale);

      ctx.font = 'bold 52px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 红色外发光 (天劫氛围)
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ff4444';
      ctx.fillText('天劫降临', 0, 0);
      ctx.shadowBlur = 0;

      // 金色渐变内核 (闪电光芒感)
      const textGrad = ctx.createLinearGradient(-80, -20, 80, 20);
      textGrad.addColorStop(0, '#ffd700');
      textGrad.addColorStop(0.5, '#ffffff');
      textGrad.addColorStop(1, '#ffd700');
      ctx.fillStyle = textGrad;
      ctx.fillText('天劫降临', 0, 0);
      ctx.restore();
    }

    // Breakthrough light beam
    if (this.breakthroughEffect > 0) {
      const alpha = this.breakthroughEffect / 1.5;
      const grad = ctx.createRadialGradient(
        this.player.x - this.camX, this.player.y - this.camY, 0,
        this.player.x - this.camX, this.player.y - this.camY, 800
      );
      grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.5})`);
      grad.addColorStop(0.3, `rgba(255,215,0,${alpha * 0.3})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();

    // HUD (not affected by camera)
    if (this.state === 'playing') {
      this.renderHUD(ctx, w, h);
    }

    // World boundary indicators
    this.renderBoundaryIndicators(ctx, w, h);

    // Pause overlay
    if (this.paused) {
      ctx.fillStyle = 'rgba(5,5,15,0.7)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.fillText('⏸️ 暂停', w / 2, h / 2);
      ctx.font = '16px "Microsoft YaHei"';
      ctx.fillStyle = '#aaa';
      ctx.fillText('按 P 继续', w / 2, h / 2 + 30);
    }
  }

  renderBackground(ctx, w, h) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(1, '#050510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  renderGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    const startX = Math.floor(this.camX / gridSize) * gridSize;
    const startY = Math.floor(this.camY / gridSize) * gridSize;

    for (let x = startX; x < this.camX + w + gridSize; x += gridSize) {
      const sx = x - this.camX;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    for (let y = startY; y < this.camY + h + gridSize; y += gridSize) {
      const sy = y - this.camY;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }
  }

  renderStars(ctx) {
    const t = performance.now() / 1000;
    for (const star of this.stars) {
      const sx = star.x - this.camX;
      const sy = star.y - this.camY;
      if (sx < -10 || sx > this.canvas.width + 10 || sy < -10 || sy > this.canvas.height + 10) continue;
      const brightness = star.brightness + Math.sin(t * star.twinkleSpeed) * 0.2;
      ctx.globalAlpha = Math.max(0, Math.min(1, brightness));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderBoundaryIndicators(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255,50,50,0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);

    const lx = -this.camX;
    if (lx > 0 && lx < w) {
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, h); ctx.stroke();
    }
    const rx = CONFIG.WORLD_WIDTH - this.camX;
    if (rx > 0 && rx < w) {
      ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, h); ctx.stroke();
    }
    const ty = -this.camY;
    if (ty > 0 && ty < h) {
      ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(w, ty); ctx.stroke();
    }
    const by = CONFIG.WORLD_HEIGHT - this.camY;
    if (by > 0 && by < h) {
      ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(w, by); ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  renderHUD(ctx, w, h) {
    const p = this.player;
    const realm = REALMS[p.realmIndex];
    const padding = 15;
    const barHeight = 18;
    const barWidth = Math.min(250, w * 0.2);
    let y = padding;

    // Background panel
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, 55);
    ctx.fillStyle = 'rgba(255,215,0,0.1)';
    ctx.fillRect(0, 54, w, 1);

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(padding, y, barWidth, barHeight);
    const hpRatio = p.hp / p.maxHp;
    const hpColor = hpRatio > 0.5 ? '#4f4' : hpRatio > 0.25 ? '#ff0' : '#f44';
    ctx.fillStyle = hpColor;
    ctx.fillRect(padding, y, barWidth * hpRatio, barHeight);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(padding, y, barWidth, barHeight);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, padding + barWidth / 2, y + 13);

    // XP bar
    y += barHeight + 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(padding, y, barWidth, barHeight - 4);
    const xpRatio = p.xp / p.xpToNext;
    ctx.fillStyle = realm.color;
    ctx.fillRect(padding, y, barWidth * xpRatio, barHeight - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(padding, y, barWidth, barHeight - 4);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.fillText(`XP: ${p.xp}/${p.xpToNext}`, padding + barWidth / 2, y + 11);

    // Center info
    const centerX = w / 2;
    ctx.textAlign = 'center';

    // Realm
    ctx.fillStyle = realm.color;
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.fillText(`◆ ${realm.name}`, centerX, 20);

    // Level
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`Lv.${p.level}`, centerX, 38);

    // Time
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(this.formatTime(this.gameTime), w - padding, 20);

    // Kills
    ctx.fillStyle = '#f88';
    ctx.font = '12px monospace';
    ctx.fillText(`击杀: ${p.kills}`, w - padding, 38);

    // Boss warning
    if (CONFIG.BOSS_INTERVAL - this.bossTimer < 10 && this.bossTimer > 0) {
      const flash = Math.sin(performance.now() / 200) > 0;
      if (flash) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠ Boss 即将出现! (${Math.ceil(CONFIG.BOSS_INTERVAL - this.bossTimer)}s)`, centerX, 52);
      }
    }

    // 属性面板 (右侧)
    this.renderStatsPanel(ctx, w, padding + 45);

    // Skills display (bottom left)
    this.renderSkillHUD(ctx, padding, h - 40);

    // 大招 HUD (底部中间)
    this.renderUltimateHUD(ctx, w, h);

    // Minimap (bottom right)
    this.renderMinimap(ctx, w, h);
  }

  renderSkillHUD(ctx, x, y) {
    const skillIcons = {
      flying_sword: '🗡️', sword_aura: '⚔️', lightning: '⚡',
      shield: '🛡️', fireball: '🔥', sword_dance: '🌀',
      spirit_burst: '💥', agility: '💨',
      boomerang: '🪃', frost_nova: '❄️',
    };
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    let i = 0;
    for (const [id, level] of Object.entries(this.player.skills)) {
      if (level > 0 && skillIcons[id]) {
        ctx.fillText(`${skillIcons[id]} Lv.${level}`, x + i * 70, y);
        i++;
      }
    }
  }

  renderStatsPanel(ctx, w, y) {
    const p = this.player;
    const x = w - 170;
    const panelW = 155;
    const lineH = 18;

    // Count equipment bonus lines
    const equipLines = this.getEquipmentBonusLines();
    const totalLines = 3 + Math.min(equipLines.length, 6);
    const panelH = lineH * totalLines + 10;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x, y, panelW, panelH);
    ctx.strokeStyle = 'rgba(255,215,0,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, panelW, panelH);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    let cy = y + 14;

    // HP
    ctx.fillStyle = '#4f4';
    ctx.fillText('❤️ 生命力', x + 6, cy);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(p.hp)}/${p.maxHp}`, x + panelW - 6, cy);
    cy += lineH;

    // 攻击力 (base + equipment)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f84';
    ctx.fillText('⚔️ 攻击力', x + 6, cy);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`+${(p.attackBonus * 100).toFixed(0)}%`, x + panelW - 6, cy);
    cy += lineH;

    // 防御力
    ctx.textAlign = 'left';
    ctx.fillStyle = '#48f';
    ctx.fillText('🛡️ 防御力', x + 6, cy);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`-${((1 - p.defenseReduction) * 100).toFixed(1)}% 减伤`, x + panelW - 6, cy);
    cy += lineH;

    // Equipment bonuses section header
    if (equipLines.length > 0) {
      ctx.fillStyle = 'rgba(255,215,0,0.3)';
      ctx.fillRect(x, cy - 2, panelW, 1);
      cy += 4;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('🔮 符文加成', x + 6, cy);
      cy += lineH;
      ctx.font = '11px monospace';
      for (const line of equipLines.slice(0, 5)) {
        ctx.fillStyle = line.color;
        ctx.fillText(`${line.icon} ${line.desc}`, x + 6, cy);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(line.value, x + panelW - 6, cy);
        ctx.textAlign = 'left';
        cy += lineH;
      }
    }
  }

  /** Get formatted equipment bonus lines for display */
  getEquipmentBonusLines() {
    const p = this.player;
    const lines = [];
    if (p.attackBonus > 0) {
      const baseAttack = (p.level - 1) * 5; // Base from levels
      const equipAttack = ((p.attackBonus * 100) - baseAttack).toFixed(0);
      if (parseFloat(equipAttack) > 0) {
        lines.push({ icon: '⚔️', color: '#ff4444', desc: '攻击', value: `+${equipAttack}%` });
      }
    }
    const hpBonus = p.maxHp - CONFIG.PLAYER_BASE_HP - (p.level - 1) * 10;
    if (hpBonus > 0) {
      lines.push({ icon: '❤️', color: '#44ff44', desc: '生命', value: `+${hpBonus}` });
    }
    const speedBonus = p.speedBonus || 0;
    if (speedBonus > 0) {
      lines.push({ icon: '💨', color: '#4488ff', desc: '速度', value: `+${(speedBonus * 100).toFixed(0)}%` });
    }
    const baseDef = (1 - Math.max(0.5, 1 - (p.level - 1) * 0.03)) * 100; // Base defense from levels
    const equipDef = ((1 - p.defenseReduction) * 100 - baseDef);
    if (equipDef > 0) {
      lines.push({ icon: '🛡️', color: '#ffdd44', desc: '护甲', value: `+${equipDef.toFixed(1)}%` });
    }
    const xpBonus = p.xpBonus || 0;
    if (xpBonus > 0) {
      lines.push({ icon: '✨', color: '#cc44ff', desc: '经验', value: `+${(xpBonus * 100).toFixed(0)}%` });
    }
    const dropBonus = p.dropRateBonus || 0;
    if (dropBonus > 0) {
      lines.push({ icon: '🍀', color: '#ffcc00', desc: '幸运', value: `+${(dropBonus * 100).toFixed(0)}%` });
    }
    return lines;
  }

  /** 渲染大招 HUD 按钮 */
  renderUltimateHUD(ctx, w, h) {
    const p = this.player;
    const btnW = 140;
    const btnH = 44;
    const btnX = w / 2 - btnW / 2;
    const btnY = h - btnH - 20;
    const time = performance.now() / 1000;

    // 复活道具显示 (左上角)
    if (p.reviveTokens > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const revX = btnX - 50;
      const revY = btnY - 5;
      ctx.beginPath();
      ctx.arc(revX, revY + btnH / 2, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,68,136,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ff4488';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💀', revX, revY + btnH / 2 + 5);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`×${p.reviveTokens}`, revX, revY + btnH / 2 + 24);
    }

    // 圆角矩形路径 (按钮背景)
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(btnX + radius, btnY);
    ctx.lineTo(btnX + btnW - radius, btnY);
    ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + radius);
    ctx.lineTo(btnX + btnW, btnY + btnH - radius);
    ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - radius, btnY + btnH);
    ctx.lineTo(btnX + radius, btnY + btnH);
    ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - radius);
    ctx.lineTo(btnX, btnY + radius);
    ctx.quadraticCurveTo(btnX, btnY, btnX + radius, btnY);
    ctx.closePath();

    if (p.ultimateReady) {
      // 充能满 — 金色高亮 + 脉冲发光动画 (4Hz 脉冲)
      const pulse = 0.7 + Math.sin(time * 4) * 0.3;
      ctx.shadowColor = `rgba(255,215,0,${pulse})`;
      ctx.shadowBlur = 15 + Math.sin(time * 4) * 5;
      ctx.fillStyle = `rgba(180,150,0,${0.7 + pulse * 0.3})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,215,0,${pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 天劫就绪', btnX + btnW / 2, btnY + 18);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#ffe';
      ctx.fillText('[E] 释放', btnX + btnW / 2, btnY + 34);
    } else {
      // 充能中 — 灰色背景 + 进度条显示 (X/10)
      ctx.fillStyle = 'rgba(50,50,50,0.8)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,100,100,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 内嵌进度条
      const barX = btnX + 8;
      const barY = btnY + 28;
      const barW = btnW - 16;
      const barH = 10;
      ctx.fillStyle = '#222';
      ctx.fillRect(barX, barY, barW, barH);

      const progress = p.ultimateCharge / 10;
      const barGrad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
      barGrad.addColorStop(0, '#6644cc');
      barGrad.addColorStop(1, '#8866ee');
      ctx.fillStyle = barGrad;
      ctx.fillRect(barX, barY, barW * progress, barH);
      ctx.strokeStyle = 'rgba(150,130,255,0.4)';
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.fillStyle = '#ccc';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.ultimateCharge} / 10`, btnX + btnW / 2, btnY + 20);
    }
  }

  /** 渲染锯齿状闪电效果 (两个点之间的折线闪电) */
  renderLightningBolt(ctx, x1, y1, x2, y2, alpha, color) {
    const camX = this.camX;
    const camY = this.camY;
    const sx1 = x1 - camX;
    const sy1 = y1 - camY;
    const sx2 = x2 - camX;
    const sy2 = y2 - camY;

    // 生成闪电锯齿折点 (5 个线段, 每个有随机垂直偏移)
    const segments = 5;
    const points = [{ x: sx1, y: sy1 }];
    const dx = (sx2 - sx1) / segments;
    const dy = (sy2 - sy1) / segments;
    for (let i = 1; i < segments; i++) {
      // 垂直方向随机偏移模拟真实闪电锯齿感
      const perpX = -dy * (Math.random() - 0.5) * 40;
      const perpY = dx * (Math.random() - 0.5) * 40;
      points.push({
        x: sx1 + dx * i + perpX,
        y: sy1 + dy * i + perpY,
      });
    }
    points.push({ x: sx2, y: sy2 });

    // 外层光晕 (宽且透明)
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.3;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // 内核 (白色核心, 细而亮)
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  renderMinimap(ctx, w, h) {
    const size = 120;
    const margin = 15;
    const mx = w - size - margin;
    const my = h - size - margin;
    const scaleX = size / CONFIG.WORLD_WIDTH;
    const scaleY = size / CONFIG.WORLD_HEIGHT;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(mx, my, size, size);
    ctx.strokeRect(mx, my, size, size);

    // Enemies (capped for performance)
    ctx.fillStyle = 'rgba(255,50,50,0.5)';
    const maxMinimapDots = 200;
    let count = 0;
    for (const e of this.enemies) {
      if (!e.alive || count >= maxMinimapDots) continue;
      const ex = mx + e.x * scaleX;
      const ey = my + e.y * scaleY;
      ctx.fillRect(ex - 1, ey - 1, 2, 2);
      count++;
    }

    // Player
    ctx.fillStyle = '#4f4';
    const px = mx + this.player.x * scaleX;
    const py = my + this.player.y * scaleY;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    // Viewport rectangle
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    const vw = this.canvas.width * scaleX;
    const vh = this.canvas.height * scaleY;
    ctx.strokeRect(mx + this.camX * scaleX, my + this.camY * scaleY, vw, vh);
  }
}

// ============ 启动 ============
window.addEventListener('error', (e) => {
  console.error('[Game Error]', e.message, e.error);
  const el = document.getElementById('startOverlay');
  if (el) {
    el.innerHTML = `<div style="color:#ff4444;font-size:1.5em;text-align:center;padding:40px;">
      游戏加载出错<br><small style="color:#aaa">${e.message}</small></div>`;
  }
});
try {
  const game = new Game();
} catch (e) {
  console.error('[Game Init Error]', e);
  const el = document.getElementById('startOverlay');
  if (el) {
    el.innerHTML = `<div style="color:#ff4444;font-size:1.5em;text-align:center;padding:40px;">
      游戏初始化失败<br><small style="color:#aaa">${e.message}</small></div>`;
  }
}
