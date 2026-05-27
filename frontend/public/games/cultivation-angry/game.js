// =============================================
// 愤怒仙兽 - Angry Immortal Beast
// 类似坦克大战 - 仙兽守护灵界
// =============================================
(function() {
'use strict';

// ─── Audio System ──────────────────────────────
const Audio = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  play(freq, type, duration, volume = 0.12) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + duration);
  },
  shoot() { this.play(600, 'square', 0.08, 0.06); },
  enemyShoot() { this.play(200, 'sawtooth', 0.06, 0.04); },
  hit() { this.play(150, 'square', 0.15, 0.08); },
  enemyDie() { this.play(300, 'triangle', 0.12, 0.08); },
  powerup() { this.play(800, 'sine', 0.1, 0.1); setTimeout(() => this.play(1000, 'sine', 0.1, 0.1), 80); },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.2, 0.12), i * 100));
  },
  gameOver() {
    this.play(400, 'sine', 0.3, 0.12);
    setTimeout(() => this.play(300, 'sine', 0.3, 0.12), 200);
    setTimeout(() => this.play(200, 'sine', 0.5, 0.12), 400);
  },
};

const CONFIG = { CELL: 28, COLS: 20, ROWS: 16, BULLET_SPEED: 5, ENEMY_SPEED: 1.2 };
const { COLS, ROWS, CELL } = CONFIG;
const WALL = 1, SOFT = 2, BASE = 3;

const REALMS = [
  { name: '炼气期', levels: 3 }, { name: '筑基期', levels: 5 },
  { name: '金丹期', levels: 7 }, { name: '元婴期', levels: 10 },
  { name: '化神期', levels: 15 }, { name: '大乘期', levels: 20 },
];

let canvas, ctx, W, H, state;
let grid, player, enemies, bullets, explosions, particles, powerups;
let keys = {};
let stars = [];
let paused = false;

function resetState() {
  return { score: 0, level: 1, realmIdx: 0, lives: 5, maxHP: 5,
    gameOver: false, won: false, levelTransition: 0, baseAlive: true,
    enemiesSpawned: 0, enemiesTotal: 0, spawnTimer: 0,
    invincible: 0, powerType: null, powerTimer: 0 };
}

function genMap(lvl) {
  grid = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < COLS; x++) {
      if (y === 0 || x === 0 || x === COLS - 1) grid[y][x] = WALL;
      else if (y === ROWS - 1) grid[y][x] = (x === Math.floor(COLS/2) || x === Math.floor(COLS/2)-1 || x === Math.floor(COLS/2)+1) ? BASE : WALL;
      else if (Math.random() < 0.2 + lvl * 0.02) grid[y][x] = SOFT;
      else if (Math.random() < 0.1) grid[y][x] = WALL;
      else grid[y][x] = 0;
    }
  }
  // Clear base area
  const bx = Math.floor(COLS/2), by = ROWS - 2;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (by+dy >= 0 && by+dy < ROWS && bx+dx >= 0 && bx+dx < COLS) {
      if (grid[by+dy][bx+dx] === SOFT) grid[by+dy][bx+dx] = 0;
    }
  }
  // Clear spawn points
  grid[1][1] = 0; grid[1][2] = 0;
  grid[1][COLS-2] = 0; grid[1][COLS-3] = 0;
  grid[1][Math.floor(COLS/2)] = 0;
}

function spawnPositions() {
  return [
    {x: 1 * CELL + CELL/2, y: 1 * CELL + CELL/2},
    {x: (COLS-2) * CELL + CELL/2, y: 1 * CELL + CELL/2},
    {x: Math.floor(COLS/2) * CELL + CELL/2, y: 1 * CELL + CELL/2},
  ];
}

const ENEMY_TYPES = [
  { name: '妖兵', color: '#ef4444', hp: 1, speed: 1, score: 10, shootRate: 0.01 },
  { name: '妖将', color: '#f97316', hp: 2, speed: 0.8, score: 25, shootRate: 0.015 },
  { name: '妖王', color: '#a855f7', hp: 3, speed: 0.6, score: 50, shootRate: 0.02 },
];

function initLevel() {
  const lvl = state.level;
  genMap(lvl);
  player = {
    x: Math.floor(COLS/2) * CELL + CELL/2,
    y: (ROWS - 4) * CELL + CELL/2,
    dir: 0, // 0=up, 1=right, 2=down, 3=left
    speed: 2.5, shooting: false, shootCD: 0,
  };
  enemies = []; bullets = []; explosions = []; particles = []; powerups = [];
  state.enemiesSpawned = 0;
  state.enemiesTotal = 8 + lvl * 3;
  state.spawnTimer = 0;
  state.baseAlive = true;
  state.invincible = 60;
  state.levelTransition = 0;
}

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 60; i++) stars.push({ x: Math.random(), y: Math.random()*0.2, r: Math.random()*1.5+0.5, a: Math.random()*0.5+0.1 });
  state = resetState();
  document.addEventListener('keydown', e => {
    if (e.key === ' ') e.preventDefault();
    if (e.key === 'p' || e.key === 'P') { paused = !paused; return; }
    if (e.key === 'r' || e.key === 'R') { state = resetState(); startGame(); }
    keys[e.key] = true;
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });
  // Mobile touch controls
  function bindBtn(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
    btn.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
    btn.addEventListener('mousedown', e => { keys[key] = true; });
    btn.addEventListener('mouseup', e => { keys[key] = false; });
  }
  bindBtn('btn-up', 'ArrowUp');
  bindBtn('btn-down', 'ArrowDown');
  bindBtn('btn-left', 'ArrowLeft');
  bindBtn('btn-right', 'ArrowRight');
  bindBtn('btn-fire', ' ');
  document.getElementById('btn-start').onclick = startGame;
  showOverlay('🐉 愤怒仙兽', '仙兽大战，守护灵界');
  requestAnimationFrame(loop);
}

function resize() {
  W = COLS * CELL; H = ROWS * CELL;
  canvas.width = W; canvas.height = H;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
}

function startGame() {
  Audio.init();
  state = resetState();
  document.getElementById('overlay-screen').classList.add('hidden');
  initLevel();
}

function showOverlay(title, sub, info) {
  const o = document.getElementById('overlay-screen');
  o.classList.remove('hidden');
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-subtitle').textContent = sub || '';
  if (state && state.gameOver && state.score > 0) {
    const best = parseInt(localStorage.getItem('angry_best') || '0');
    const isNew = state.score > best;
    if (isNew) localStorage.setItem('angry_best', state.score);
    if (info) info += isNew ? ' 🆕 最高纪录!' : (best > 0 ? ` | 最高: ${best}` : '');
  }
  if (info) document.getElementById('overlay-info').textContent = info;
  else document.getElementById('overlay-info').innerHTML = '';
  document.getElementById('btn-start').textContent = state && state.gameOver ? '重新战斗' : '开始战斗';
}

function update() {
  if (state.gameOver || state.levelTransition > 0 || paused) return;

  // Player movement
  let dx = 0, dy = 0;
  if (keys['ArrowUp'] || keys['w']) { dy = -1; player.dir = 0; }
  else if (keys['ArrowDown'] || keys['s']) { dy = 1; player.dir = 2; }
  else if (keys['ArrowLeft'] || keys['a']) { dx = -1; player.dir = 3; }
  else if (keys['ArrowRight'] || keys['d']) { dx = 1; player.dir = 1; }

  if (dx || dy) {
    const nx = player.x + dx * player.speed;
    const ny = player.y + dy * player.speed;
    if (!collides(nx, ny, CELL * 0.35)) {
      player.x = nx; player.y = ny;
    }
  }

  // Player shoot
  if (player.shootCD > 0) player.shootCD--;
  if (keys[' '] && player.shootCD <= 0) {
    shoot(player.x, player.y, player.dir, 'player');
    player.shootCD = 15;
    Audio.shoot();
  }

  // Invincibility
  if (state.invincible > 0) state.invincible--;

  // Spawn enemies
  if (state.enemiesSpawned < state.enemiesTotal) {
    state.spawnTimer++;
    if (state.spawnTimer >= 60) {
      state.spawnTimer = 0;
      spawnEnemy();
    }
  }

  // Update enemies
  for (const e of enemies) {
    if (!e.alive) continue;
    e.moveTimer++;
    if (e.moveTimer >= (60 / e.speed)) {
      e.moveTimer = 0;
      // Move toward player or base
      const targetX = state.baseAlive ? Math.floor(COLS/2) * CELL + CELL/2 : player.x;
      const targetY = state.baseAlive ? (ROWS-2) * CELL + CELL/2 : player.y;
      const edx = Math.sign(targetX - e.x);
      const edy = Math.sign(targetY - e.y);
      const preferX = Math.random() < 0.6;
      let nx = e.x + (preferX ? edx : 0) * e.speed;
      let ny = e.y + (preferX ? 0 : edy) * e.speed;
      if (!collidesEnemy(nx, ny, e, CELL * 0.3)) {
        e.x = nx; e.y = ny;
      } else {
        e.x += (preferX ? 0 : edx) * e.speed;
        e.y += (preferX ? edy : 0) * e.speed;
      }
      e.dir = Math.abs(targetX - e.x) > Math.abs(targetY - e.y) ? (targetX > e.x ? 1 : 3) : (targetY > e.y ? 2 : 0);
    }
    // Enemy shoot
    if (Math.random() < e.shootRate) {
      shoot(e.x, e.y, e.dir, 'enemy');
      Audio.enemyShoot();
    }
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx; b.y += b.vy;
    // Out of bounds
    if (b.x < 0 || b.y < 0 || b.x > W || b.y > H) { bullets.splice(i, 1); continue; }
    // Hit wall
    const cx = Math.floor(b.x / CELL), cy = Math.floor(b.y / CELL);
    if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS) {
      if (grid[cy][cx] === WALL) { bullets.splice(i, 1); spawnParticles(b.x, b.y, '#888', 3); continue; }
      if (grid[cy][cx] === SOFT) { grid[cy][cx] = 0; bullets.splice(i, 1); spawnParticles(b.x, b.y, '#cd853f', 5); continue; }
      if (grid[cy][cx] === BASE) {
        grid[cy][cx] = 0;
        state.baseAlive = false;
        spawnParticles(b.x, b.y, '#ffd700', 20);
        bullets.splice(i, 1);
        state.gameOver = true;
        setTimeout(() => showOverlay('💀 灵界沦陷', `得分: ${state.score}`,
          `境界: ${REALMS[state.realmIdx].name} | 关卡: ${state.level}`), 1000);
        continue;
      }
    }
    // Player bullet hits enemy
    if (b.owner === 'player') {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (Math.abs(b.x - e.x) < CELL * 0.4 && Math.abs(b.y - e.y) < CELL * 0.4) {
          e.hp--;
          bullets.splice(i, 1);
          spawnParticles(b.x, b.y, e.color, 5);
          if (e.hp <= 0) {
            e.alive = false;
            state.score += e.score;
            state.enemiesSpawned++;
            spawnParticles(e.x, e.y, e.color, 12);
            Audio.enemyDie();
            // Chance to drop powerup
            if (Math.random() < 0.15) {
              powerups.push({ x: e.x, y: e.y, type: Math.random() < 0.5 ? 'heal' : 'rapid' });
            }
          }
          break;
        }
      }
    }
    // Enemy bullet hits player
    if (b.owner === 'enemy' && state.invincible <= 0) {
      if (Math.abs(b.x - player.x) < CELL * 0.4 && Math.abs(b.y - player.y) < CELL * 0.4) {
        bullets.splice(i, 1);
        state.lives--;
        state.invincible = 90;
        spawnParticles(player.x, player.y, '#4ade80', 15);
        if (state.lives <= 0) {
          state.gameOver = true;
          setTimeout(() => showOverlay('💀 仙兽陨落', `得分: ${state.score}`,
            `境界: ${REALMS[state.realmIdx].name} | 关卡: ${state.level}`), 1000);
        }
      }
    }
  }

  // Pickup powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (Math.abs(player.x - p.x) < CELL * 0.5 && Math.abs(player.y - p.y) < CELL * 0.5) {
      if (p.type === 'heal') {
        state.lives = Math.min(state.lives + 1, state.maxHP);
        spawnParticles(p.x, p.y, '#4ade80', 8);
      } else if (p.type === 'rapid') {
        player.shootCD = Math.max(0, player.shootCD - 5);
        spawnParticles(p.x, p.y, '#ffd700', 8);
      }
      Audio.powerup();
      powerups.splice(i, 1);
    }
  }

  // Remove dead enemies
  enemies = enemies.filter(e => e.alive);

  // Check level complete
  const kills = state.enemiesTotal - enemies.length - (state.enemiesTotal - state.enemiesSpawned);
  if (state.enemiesSpawned >= state.enemiesTotal && enemies.length === 0 && !state.gameOver) {
    state.levelTransition = 90;
    state.score += 300 * state.level;
    state.level++;
    let lvlSum = 0;
    const prevRealm = state.realmIdx;
    for (let i = 0; i < REALMS.length; i++) {
      lvlSum += REALMS[i].levels;
      if (state.level <= lvlSum) { state.realmIdx = i; break; }
    }
    if (state.realmIdx !== prevRealm) Audio.levelUp();
    setTimeout(() => {
      initLevel();
    }, 1500);
  }
}

function collides(x, y, r) {
  // Check grid collision
  const checks = [{x: x-r, y: y-r}, {x: x+r, y: y-r}, {x: x-r, y: y+r}, {x: x+r, y: y+r}];
  for (const p of checks) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
    if (grid[cy][cx] === WALL || grid[cy][cx] === SOFT || grid[cy][cx] === BASE) return true;
  }
  // Enemy collision
  for (const e of enemies) {
    if (!e.alive) continue;
    if (Math.abs(x - e.x) < CELL * 0.5 && Math.abs(y - e.y) < CELL * 0.5) return true;
  }
  return false;
}

function collidesEnemy(x, y, self, r) {
  const checks = [{x: x-r, y: y-r}, {x: x+r, y: y-r}, {x: x-r, y: y+r}, {x: x+r, y: y+r}];
  for (const p of checks) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
    if (grid[cy][cx] === WALL || grid[cy][cx] === SOFT || grid[cy][cx] === BASE) return true;
  }
  // Other enemy collision
  for (const e of enemies) {
    if (e === self || !e.alive) continue;
    if (Math.abs(x - e.x) < CELL * 0.6 && Math.abs(y - e.y) < CELL * 0.6) return true;
  }
  return false;
}

function shoot(x, y, dir, owner) {
  const dirs = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
  const d = dirs[dir];
  bullets.push({
    x: x + d.x * CELL * 0.5, y: y + d.y * CELL * 0.5,
    vx: d.x * CONFIG.BULLET_SPEED, vy: d.y * CONFIG.BULLET_SPEED,
    owner
  });
}

function spawnEnemy() {
  const spawns = spawnPositions();
  const sp = spawns[Math.floor(Math.random() * spawns.length)];
  const lvl = state.level;
  const typeIdx = lvl < 3 ? 0 : lvl < 7 ? (Math.random() < 0.7 ? 0 : 1) : (Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2);
  const t = ENEMY_TYPES[typeIdx];
  enemies.push({
    x: sp.x, y: sp.y, dir: 2, ...t, alive: true, moveTimer: 0
  });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) particles.push({
    x, y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5 - 1,
    life: 20 + Math.random()*15, color, r: 2 + Math.random()*3
  });
}

function updateUI() {
  document.getElementById('realm-name').textContent = REALMS[state.realmIdx].name;
  const colors = ['#e0e0e0', '#4ade80', '#ffd700', '#a855f7', '#ef4444', '#ff6b9d'];
  document.getElementById('realm-name').style.color = colors[state.realmIdx];
  document.getElementById('score-display').textContent = `得分: ${state.score}`;
  document.getElementById('level-display').textContent = `关卡: ${state.level}`;
  document.getElementById('lives-display').textContent = `敌人: ${state.enemiesTotal - enemies.length}/${state.enemiesTotal}`;
  document.getElementById('hp-display').textContent = `❤️ ${state.lives}/${state.maxHP}`;
}

// ─── Rendering ─────────────────────────────────
let time = 0;
particles = [];

function loop(ts) {
  try {
    time = ts * 0.001;
    update();
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H);
    drawStars();
    drawGrid();
    drawPowerups();
    drawEnemies();
    drawPlayer();
    drawBullets();
    drawParticles();
    if (state.levelTransition > 0) drawLevelComplete();
    if (paused) drawPaused();
    updateUI();
  } catch (e) {
    console.error('cultivation-angry game error:', e);
  }
  requestAnimationFrame(loop);
}

function drawStars() {
  for (const s of stars) {
    ctx.globalAlpha = s.a * (0.5 + 0.5 * Math.sin(time * 0.3 + s.x * 10));
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = x * CELL, py = y * CELL;
    if (grid[y][x] === WALL) {
      ctx.fillStyle = '#4a4a5a'; ctx.fillRect(px, py, CELL, CELL);
      ctx.fillStyle = '#5a5a6a'; ctx.fillRect(px, py, CELL, 2);
    } else if (grid[y][x] === SOFT) {
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(px+1, py+1, CELL-2, CELL-2);
    } else if (grid[y][x] === BASE) {
      ctx.fillStyle = state.baseAlive ? '#ffd700' : '#333';
      ctx.fillRect(px+2, py+2, CELL-4, CELL-4);
      ctx.font = `${CELL*0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(state.baseAlive ? '🏛️' : '💀', px + CELL/2, py + CELL/2);
    } else {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#12121e' : '#151522';
      ctx.fillRect(px, py, CELL, CELL);
    }
  }
}

function drawPlayer() {
  if (state.invincible > 0 && Math.floor(state.invincible / 4) % 2 === 0) return;
  const px = player.x, py = player.y;
  const dir = player.dir;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(dir * Math.PI / 2);

  // Body
  ctx.fillStyle = '#4ade80';
  ctx.shadowColor = 'rgba(74,222,128,0.5)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(0, 0, CELL * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Cannon
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-3, -CELL * 0.45, 6, CELL * 0.3);

  ctx.restore();

  ctx.font = `${CELL*0.35}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🐉', px, py);
}

function drawEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    const px = e.x, py = e.y;
    ctx.fillStyle = e.color;
    ctx.shadowColor = e.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(px, py, CELL * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = `${CELL*0.3}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e.hp > 1 ? '👹' : '👺', px, py);

    if (e.hp > 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px - 10, py + CELL * 0.28, 20, 3);
      ctx.fillStyle = e.color;
      ctx.fillRect(px - 10, py + CELL * 0.28, 20 * (e.hp / 3), 3);
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = b.owner === 'player' ? '#4ade80' : '#ef4444';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawPowerups() {
  for (const p of powerups) {
    const bob = Math.sin(time * 3 + p.x) * 3;
    ctx.font = `${CELL*0.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'heal' ? '💚' : '⚡', p.x, p.y + bob);
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life / 35;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life/35), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLevelComplete() {
  const alpha = Math.min(1, (90 - state.levelTransition) / 30);
  ctx.fillStyle = `rgba(5,5,15,${alpha * 0.7})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('🎉 守护成功!', W/2, H/2 - 20);
  ctx.fillStyle = '#ccc'; ctx.font = '18px "Microsoft YaHei"';
  ctx.fillText(`第 ${state.level + 1} 关`, W/2, H/2 + 20);
  ctx.globalAlpha = 1;
}

function drawPaused() {
  ctx.fillStyle = 'rgba(5,5,15,0.7)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('⏸️ 暂停', W/2, H/2);
  ctx.font = '16px "Microsoft YaHei"'; ctx.fillStyle = '#aaa';
  ctx.fillText('按 P 继续', W/2, H/2 + 30);
}

init();
})();
