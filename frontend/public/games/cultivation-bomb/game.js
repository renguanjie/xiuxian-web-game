// =============================================
// 炸弹仙人 - Bomb Immortal (Cultivation Theme)
// 回合制爆破游戏
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
  step() { this.play(200, 'triangle', 0.04, 0.04); },
  placeBomb() { this.play(150, 'square', 0.1, 0.08); },
  explode() {
    this.play(80, 'sawtooth', 0.3, 0.12);
    setTimeout(() => this.play(60, 'square', 0.2, 0.08), 50);
  },
  pickup() { this.play(800, 'sine', 0.1, 0.1); setTimeout(() => this.play(1000, 'sine', 0.1, 0.1), 80); },
  enemyDie() { this.play(300, 'triangle', 0.12, 0.08); },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.2, 0.12), i * 100));
  },
  gameOver() {
    this.play(400, 'sine', 0.3, 0.12);
    setTimeout(() => this.play(300, 'sine', 0.3, 0.12), 200);
    setTimeout(() => this.play(200, 'sine', 0.5, 0.12), 400);
  },
};

const CONFIG = {
  CELL: 36, COLS: 17, ROWS: 13,
  BOMB_FUSE: 3,
  EXPLOSION_DURATION: 18,
  PARTICLE_MAX: 200,
};
const COLS = CONFIG.COLS, ROWS = CONFIG.ROWS, CELL = CONFIG.CELL;
const WALL = 1, EMPTY = 0, SOFT = 2;

const REALMS = [
  { name: '炼气期', levels: 3 }, { name: '筑基期', levels: 5 },
  { name: '金丹期', levels: 7 }, { name: '元婴期', levels: 10 },
  { name: '化神期', levels: 15 }, { name: '大乘期', levels: 20 },
];

const COLORS = {
  wall: '#5c4033', wallHighlight: '#8b6914',
  soft: '#a0522d', softHighlight: '#cd853f',
  floor1: '#1a1a2e', floor2: '#1e1e32',
  player: '#4ade80', playerGlow: 'rgba(74,222,128,0.4)',
  enemy: '#ef4444', enemyGlow: 'rgba(239,68,68,0.4)',
  bomb: '#333', bombFuse: '#ff6b00',
  explosion: '#ff4400', explosionCore: '#ffdd00',
  pickupBomb: '#4a9eff', pickupRange: '#a855f7',
  star: 'rgba(255,255,255,0.5)',
};

let canvas, ctx, W, H, state;
let grid, player, enemies, bombs, explosions, particles, pickups;
let stars = [];
let paused = false;

function resetState() {
  return { score: 0, level: 1, realmIdx: 0, turn: 0, lives: 3,
    maxBombs: 1, bombRange: 1, activeBombs: 0,
    enemiesLeft: 0, gameOver: false, won: false, levelComplete: false,
    inputLocked: false, levelTransition: 0, deathAnim: 0 };
}

function genMap(lvl) {
  grid = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < COLS; x++) {
      if (y === 0 || y === ROWS-1 || x === 0 || x === COLS-1) grid[y][x] = WALL;
      else if (x % 2 === 0 && y % 2 === 0) grid[y][x] = WALL;
      else if (x <= 2 && y <= 2) grid[y][x] = EMPTY;
      else grid[y][x] = Math.random() < Math.min(0.35, 0.15 + lvl * 0.02) ? SOFT : EMPTY;
    }
  }
}

function spawnEnemies(count) {
  enemies = [];
  const positions = [];
  for (let y = 2; y < ROWS - 1; y++) {
    for (let x = 2; x < COLS - 1; x++) {
      if (grid[y][x] === EMPTY && !(x <= 3 && y <= 3)) positions.push({x, y});
    }
  }
  shuffle(positions);
  const types = [
    { name: '妖卒', speed: 1, color: '#ef4444', hp: 1, score: 10 },
    { name: '妖将', speed: 1, color: '#f97316', hp: 2, score: 25 },
    { name: '妖王', speed: 2, color: '#a855f7', hp: 3, score: 50 },
  ];
  for (let i = 0; i < count && i < positions.length; i++) {
    const t = types[i < count*0.5 ? 0 : i < count*0.8 ? 1 : 2];
    enemies.push({ ...t, x: positions[i].x, y: positions[i].y, alive: true, moveCD: 0 });
  }
  state.enemiesLeft = count;
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [a[i], a[j]] = [a[j], a[i]]; } }

function spawnPickups(count) {
  pickups = [];
  const positions = [];
  for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) if (grid[y][x] === EMPTY) positions.push({x, y});
  shuffle(positions);
  for (let i = 0; i < count && i < positions.length; i++) {
    pickups.push({ x: positions[i].x, y: positions[i].y, type: Math.random() < 0.5 ? 'bomb' : 'range' });
  }
}

function initLevel() {
  const lvl = state.level;
  genMap(lvl);
  player = { x: 1, y: 1 };
  bombs = []; explosions = []; particles = [];
  state.activeBombs = 0; state.turn = 0; state.inputLocked = false;
  const enemyCount = Math.min(3 + lvl * 2, 18);
  spawnEnemies(enemyCount);
  spawnPickups(Math.min(1 + Math.floor(lvl / 3), 4));
  updateUI();
}

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 60; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random()*1.5+0.5, a: Math.random()*0.6+0.2 });
  state = resetState();
  document.getElementById('btn-start').onclick = startGame;
  document.addEventListener('keydown', handleKey);
  // Mobile touch controls
  function bindMobileBtn(id, dx, dy) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let interval = null;
    function startMove(e) { e.preventDefault(); Audio.init(); movePlayer(dx, dy); interval = setInterval(() => movePlayer(dx, dy), 200); }
    function stopMove(e) { e.preventDefault(); clearInterval(interval); }
    btn.addEventListener('touchstart', startMove);
    btn.addEventListener('touchend', stopMove);
    btn.addEventListener('mousedown', startMove);
    btn.addEventListener('mouseup', stopMove);
    btn.addEventListener('mouseleave', stopMove);
  }
  function bindMobileFire() {
    const btn = document.getElementById('btn-fire');
    if (!btn) return;
    btn.addEventListener('touchstart', e => { e.preventDefault(); Audio.init(); placeBomb(); });
    btn.addEventListener('mousedown', e => { placeBomb(); });
  }
  bindMobileBtn('btn-up', 0, -1);
  bindMobileBtn('btn-down', 0, 1);
  bindMobileBtn('btn-left', -1, 0);
  bindMobileBtn('btn-right', 1, 0);
  bindMobileFire();
  showOverlay('💣 炸弹仙人', '回合制爆破，消灭所有敌人',
    '↑↓←→/WASD: 移动\n空格: 放置炸弹\n消灭所有敌人即可过关\n收集道具增强实力');
  requestAnimationFrame(loop);
}

function resize() {
  const s = Math.min((window.innerWidth - 20) / COLS, (window.innerHeight - 80) / ROWS);
  W = CELL * COLS; H = CELL * ROWS;
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
  document.getElementById('overlay-subtitle').textContent = sub;
  if (state && state.gameOver && state.score > 0) {
    const best = parseInt(localStorage.getItem('bomb_best') || '0');
    const isNew = state.score > best;
    if (isNew) localStorage.setItem('bomb_best', state.score);
    if (info) info += isNew ? '\n🆕 最高纪录!' : (best > 0 ? `\n最高: ${best}` : '');
  }
  document.getElementById('overlay-info').innerHTML = info ? info.replace(/\n/g, '<br>') : '';
  document.getElementById('btn-start').textContent = state && state.gameOver ? '重新修炼' : '开始修炼';
}

function handleKey(e) {
  if (e.key === 'p' || e.key === 'P') { paused = !paused; return; }
  if (state.inputLocked || state.gameOver) {
    if (e.key === 'r' || e.key === 'R') { state = resetState(); startGame(); }
    return;
  }
  let dx = 0, dy = 0;
  if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
  else if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
  else if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
  else if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;
  else if (e.key === ' ') { placeBomb(); e.preventDefault(); return; }
  else if (e.key === 'r' || e.key === 'R') { state = resetState(); startGame(); return; }
  else return;
  e.preventDefault();
  movePlayer(dx, dy);
}

function movePlayer(dx, dy) {
  const nx = player.x + dx, ny = player.y + dy;
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || grid[ny][nx] === WALL || grid[ny][nx] === SOFT) return;
  for (const b of bombs) if (b.x === nx && b.y === ny) return;
  player.x = nx; player.y = ny;
  checkPickups();
  Audio.step();
  endTurn();
}

function placeBomb() {
  if (state.activeBombs >= state.maxBombs) return;
  if (bombs.some(b => b.x === player.x && b.y === player.y)) return;
  bombs.push({ x: player.x, y: player.y, fuse: CONFIG.BOMB_FUSE, range: state.bombRange });
  state.activeBombs++;
  Audio.placeBomb();
  endTurn();
}

function checkPickups() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    if (pickups[i].x === player.x && pickups[i].y === player.y) {
      const p = pickups[i];
      if (p.type === 'bomb') state.maxBombs++;
      else state.bombRange++;
      Audio.pickup();
      spawnParticles(p.x * CELL + CELL/2, p.y * CELL + CELL/2, p.type === 'bomb' ? COLORS.pickupBomb : COLORS.pickupRange, 8);
      pickups.splice(i, 1);
    }
  }
}

function endTurn() {
  state.turn++;
  // Tick bombs
  for (let i = bombs.length - 1; i >= 0; i--) {
    bombs[i].fuse--;
    if (bombs[i].fuse <= 0) {
      explode(bombs[i]);
      bombs.splice(i, 1);
      state.activeBombs--;
    }
  }
  // Chain explosions handled in explode()
  // Move enemies
  for (const e of enemies) {
    if (!e.alive) continue;
    e.moveCD++;
    if (e.moveCD >= e.speed) {
      e.moveCD = 0;
      moveEnemy(e);
    }
    if (e.x === player.x && e.y === player.y) {
      playerHit();
      return;
    }
  }
  checkLevelComplete();
}

function moveEnemy(e) {
  const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
  const dx = player.x - e.x, dy = player.y - e.y;
  dirs.sort((a, b) => {
    const da = Math.abs(e.x + a.x - player.x) + Math.abs(e.y + a.y - player.y);
    const db = Math.abs(e.x + b.x - player.x) + Math.abs(e.y + b.y - player.y);
    return da - db + (Math.random() - 0.5) * 2;
  });
  for (const d of dirs) {
    const nx = e.x + d.x, ny = e.y + d.y;
    if (nx <= 0 || ny <= 0 || nx >= COLS-1 || ny >= ROWS-1) continue;
    if (grid[ny][nx] !== EMPTY) continue;
    if (bombs.some(b => b.x === nx && b.y === ny)) continue;
    if (enemies.some(o => o !== e && o.alive && o.x === nx && o.y === ny)) continue;
    e.x = nx; e.y = ny;
    return;
  }
}

function explode(bomb) {
  Audio.explode();
  const cx = bomb.x, cy = bomb.y, range = bomb.range;
  const dirs = [{x:0,y:0},{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
  for (const d of dirs) {
    for (let i = d.x === 0 && d.y === 0 ? 0 : 1; i <= range; i++) {
      const tx = cx + d.x * i, ty = cy + d.y * i;
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) break;
      if (grid[ty][tx] === WALL) break;
      if (grid[ty][tx] === SOFT) {
        grid[ty][tx] = EMPTY;
        addExplosion(tx, ty);
        spawnParticles(tx * CELL + CELL/2, ty * CELL + CELL/2, COLORS.softHighlight, 5);
        break;
      }
      addExplosion(tx, ty);
      // Hit enemies
      for (const e of enemies) {
        if (e.alive && e.x === tx && e.y === ty) {
          e.hp--;
          if (e.hp <= 0) {
            e.alive = false;
            state.enemiesLeft--;
            state.score += e.score;
            Audio.enemyDie();
            spawnParticles(tx * CELL + CELL/2, ty * CELL + CELL/2, e.color, 12);
          }
        }
      }
      // Hit player
      if (player.x === tx && player.y === ty) { playerHit(); return; }
      // Chain: hit other bombs
      for (let j = bombs.length - 1; j >= 0; j--) {
        if (bombs[j] !== bomb && bombs[j].x === tx && bombs[j].y === ty) {
          explode(bombs[j]);
          bombs.splice(j, 1);
          state.activeBombs--;
        }
      }
    }
  }
}

function addExplosion(x, y) {
  explosions.push({ x, y, timer: CONFIG.EXPLOSION_DURATION });
}

function playerHit() {
  state.lives--;
  spawnParticles(player.x * CELL + CELL/2, player.y * CELL + CELL/2, COLORS.player, 20);
  if (state.lives <= 0) {
    state.gameOver = true;
    state.inputLocked = true;
    setTimeout(() => showOverlay('💀 道消身殒', `最终得分: ${state.score}`,
      `关卡: ${state.level}\n回合: ${state.turn}\n境界: ${REALMS[state.realmIdx].name}`), 500);
  } else {
    player.x = 1; player.y = 1;
  }
}

function checkLevelComplete() {
  if (state.enemiesLeft <= 0 && !state.levelComplete) {
    state.levelComplete = true;
    state.score += 100 * state.level;
    // Advance realm
    let lvlSum = 0;
    for (let i = 0; i < REALMS.length; i++) {
      lvlSum += REALMS[i].levels;
      if (state.level <= lvlSum) { state.realmIdx = i; break; }
    }
    state.level++;
    state.inputLocked = true;
    Audio.levelUp();
    setTimeout(() => {
      state.levelComplete = false;
      state.inputLocked = false;
      initLevel();
    }, 1500);
  }
}

function updateUI() {
  document.getElementById('realm-name').textContent = REALMS[state.realmIdx].name;
  document.getElementById('realm-name').style.color = REALMS[state.realmIdx].name === '炼气期' ? '#e0e0e0' :
    REALMS[state.realmIdx].name === '筑基期' ? '#4ade80' : REALMS[state.realmIdx].name === '金丹期' ? '#ffd700' :
    REALMS[state.realmIdx].name === '元婴期' ? '#a855f7' : REALMS[state.realmIdx].name === '化神期' ? '#ef4444' : '#ff6b9d';
  document.getElementById('score-display').textContent = `得分: ${state.score}`;
  document.getElementById('level-display').textContent = `关卡: ${state.level}`;
  document.getElementById('turn-display').textContent = `回合: ${state.turn}`;
  document.getElementById('lives-display').textContent = `❤️ ${state.lives}`;
  document.getElementById('bomb-display').textContent = `💣 炸弹: ${state.maxBombs - state.activeBombs}/${state.maxBombs}`;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count && particles.length < CONFIG.PARTICLE_MAX; i++) {
    particles.push({ x, y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 30 + Math.random()*20, color, r: 2 + Math.random()*3 });
  }
}

// ─── Rendering ─────────────────────────────────
let time = 0;
function loop(ts) {
  time = ts * 0.001;
  ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H);
  drawStars();
  if (!state.gameOver) {
    drawGrid();
    drawPickups();
    drawBombs();
    drawExplosions();
    drawEnemies();
    drawPlayer();
    drawParticles();
    if (state.levelComplete) drawLevelComplete();
    if (paused) drawPaused();
  }
  updateUI();
  requestAnimationFrame(loop);
}

function drawPaused() {
  ctx.fillStyle = 'rgba(5,5,15,0.7)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('⏸️ 暂停', W/2, H/2);
  ctx.font = '16px "Microsoft YaHei"'; ctx.fillStyle = '#aaa';
  ctx.fillText('按 P 继续', W/2, H/2 + 30);
}

function drawStars() {
  for (const s of stars) {
    ctx.globalAlpha = s.a * (0.5 + 0.5 * Math.sin(time * 0.5 + s.x * 10));
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * CELL, py = y * CELL;
      if (grid[y][x] === WALL) {
        ctx.fillStyle = COLORS.wall; ctx.fillRect(px, py, CELL, CELL);
        ctx.fillStyle = COLORS.wallHighlight; ctx.fillRect(px, py, CELL, 3); ctx.fillRect(px, py, 3, CELL);
      } else if (grid[y][x] === SOFT) {
        ctx.fillStyle = COLORS.soft; ctx.fillRect(px+1, py+1, CELL-2, CELL-2);
        ctx.fillStyle = COLORS.softHighlight; ctx.fillRect(px+1, py+1, CELL-2, 2);
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor1 : COLORS.floor2;
        ctx.fillRect(px, py, CELL, CELL);
      }
    }
  }
}

function drawPlayer() {
  const px = player.x * CELL + CELL/2, py = player.y * CELL + CELL/2;
  const pulse = 0.8 + 0.2 * Math.sin(time * 3);
  ctx.shadowColor = COLORS.playerGlow; ctx.shadowBlur = 12 * pulse;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath(); ctx.arc(px, py, CELL * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = `${CELL * 0.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🧙', px, py);
}

function drawEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    const px = e.x * CELL + CELL/2, py = e.y * CELL + CELL/2;
    ctx.shadowColor = e.color; ctx.shadowBlur = 8;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(px, py, CELL * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = `${CELL * 0.35}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e.hp > 1 ? '👹' : '👺', px, py);
    if (e.hp > 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px - 12, py + CELL * 0.3, 24, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px - 12, py + CELL * 0.3, 24 * (e.hp / 3), 4);
    }
  }
}

function drawBombs() {
  for (const b of bombs) {
    const px = b.x * CELL + CELL/2, py = b.y * CELL + CELL/2;
    const t = b.fuse / CONFIG.BOMB_FUSE;
    const r = CELL * 0.3 + (1 - t) * CELL * 0.05;
    ctx.fillStyle = COLORS.bomb;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.fuse <= 1 ? '#ff0000' : COLORS.bombFuse;
    ctx.beginPath(); ctx.arc(px + 4, py - r + 2, 3, 0, Math.PI * 2); ctx.fill();
    if (b.fuse <= 1) {
      ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, r + 3, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

function drawExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.timer--;
    if (e.timer <= 0) { explosions.splice(i, 1); continue; }
    const t = e.timer / CONFIG.EXPLOSION_DURATION;
    const alpha = t;
    const r = CELL * 0.4 * (1 + (1 - t) * 0.3);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.explosionCore;
    ctx.beginPath(); ctx.arc(e.x * CELL + CELL/2, e.y * CELL + CELL/2, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.explosion;
    ctx.beginPath(); ctx.arc(e.x * CELL + CELL/2, e.y * CELL + CELL/2, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPickups() {
  for (const p of pickups) {
    const px = p.x * CELL + CELL/2, py = p.y * CELL + CELL/2;
    const bob = Math.sin(time * 3 + p.x + p.y) * 3;
    ctx.fillStyle = p.type === 'bomb' ? COLORS.pickupBomb : COLORS.pickupRange;
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px, py + bob, CELL * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = `${CELL * 0.3}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'bomb' ? '💣' : '⚡', px, py + bob);
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life / 50), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLevelComplete() {
  ctx.fillStyle = 'rgba(5,5,15,0.7)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 36px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🎉 过关成功!', W/2, H/2 - 20);
  ctx.fillStyle = '#ccc'; ctx.font = '18px "Microsoft YaHei", sans-serif';
  ctx.fillText(`+${100 * state.level} 分 | 第 ${state.level + 1} 关`, W/2, H/2 + 20);
}

init();
})();
