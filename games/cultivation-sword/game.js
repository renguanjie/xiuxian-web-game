// =============================================
// 仙剑索敌 - Sword Immortal
// 连线斩妖（同色相邻消除，不能重复）
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
  chainStart() { this.play(500, 'sine', 0.06, 0.06); },
  chainExtend() { this.play(500 + Math.random() * 200, 'sine', 0.04, 0.04); },
  eliminate(n) {
    for (let i = 0; i < Math.min(n, 6); i++) {
      setTimeout(() => this.play(400 + i * 80, 'triangle', 0.1, 0.08), i * 40);
    }
  },
  combo() {
    [600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.15, 0.1), i * 60));
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.2, 0.12), i * 100));
  },
  gameOver() {
    this.play(400, 'sine', 0.3, 0.12);
    setTimeout(() => this.play(300, 'sine', 0.3, 0.12), 200);
    setTimeout(() => this.play(200, 'sine', 0.5, 0.12), 400);
  },
};

const CONFIG = { COLS: 10, ROWS: 8, CELL: 52, COLORS: 5, MIN_CHAIN: 2 };
const { COLS, ROWS, CELL } = CONFIG;

const REALMS = [
  { name: '炼气期', levels: 3 }, { name: '筑基期', levels: 5 },
  { name: '金丹期', levels: 7 }, { name: '元婴期', levels: 10 },
  { name: '化神期', levels: 15 }, { name: '大乘期', levels: 20 },
];

const ENEMY_TYPES = [
  { name: '火妖', color: '#ef4444', glow: 'rgba(239,68,68,0.5)', icon: '🔥' },
  { name: '水妖', color: '#4a9eff', glow: 'rgba(74,158,255,0.5)', icon: '💧' },
  { name: '木妖', color: '#4ade80', glow: 'rgba(74,222,128,0.5)', icon: '🌿' },
  { name: '金妖', color: '#ffd700', glow: 'rgba(255,215,0,0.5)', icon: '⚡' },
  { name: '土妖', color: '#a0522d', glow: 'rgba(160,82,45,0.5)', icon: '🪨' },
];

let canvas, ctx, W, H, state;
let grid, visited;
let chain, linePath, particles, floatTexts;
let stars = [];
let paused = false;

function resetState() {
  return { score: 0, level: 1, realmIdx: 0, combo: 0, moves: 0,
    gameOver: false, won: false, levelTransition: 0, lives: 3 };
}

function genGrid() {
  grid = []; visited = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = []; visited[y] = [];
    for (let x = 0; x < COLS; x++) {
      grid[y][x] = Math.floor(Math.random() * CONFIG.COLORS);
      visited[y][x] = false;
    }
  }
}

function neighbors(x, y) {
  return [{x:x+1,y:y},{x:x-1,y:y},{x:x,y:y+1},{x:x,y:y-1}].filter(
    p => p.x >= 0 && p.y >= 0 && p.x < COLS && p.y < ROWS && !visited[p.y][p.x]);
}

function floodFill(sx, sy, color) {
  const result = [];
  const visited = new Set();
  const queue = [{x: sx, y: sy}];
  visited.add(`${sx},${sy}`);
  while (queue.length > 0) {
    const {x, y} = queue.shift();
    result.push({x, y});
    for (const n of [{x:x+1,y:y},{x:x-1,y:y},{x:x,y:y+1},{x:x,y:y-1}]) {
      const key = `${n.x},${n.y}`;
      if (n.x >= 0 && n.y >= 0 && n.x < COLS && n.y < ROWS && !visited.has(key) && grid[n.y][n.x] === color) {
        visited.add(key);
        queue.push(n);
      }
    }
  }
  return result;
}

function isAdjacentToChain(x, y, chainArr) {
  return chainArr.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) === 1);
}

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 50; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random()*1.5+0.5, a: Math.random()*0.5+0.1 });
  state = resetState();
  genGrid();
  chain = []; linePath = []; particles = []; floatTexts = [];
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, {passive: false});
  canvas.addEventListener('touchmove', onTouchMove, {passive: false});
  canvas.addEventListener('touchend', onTouchEnd, {passive: false});
  document.addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') paused = !paused; });
  document.getElementById('btn-start').onclick = startGame;
  showOverlay('⚔️ 仙剑索敌', '连线斩妖，一击必杀');
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
  genGrid();
  document.getElementById('overlay-screen').classList.add('hidden');
}

function showOverlay(title, sub, info) {
  const o = document.getElementById('overlay-screen');
  o.classList.remove('hidden');
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-subtitle').textContent = sub || '';
  if (info) document.getElementById('overlay-info').textContent = info;
  else document.getElementById('overlay-info').innerHTML = '';
  document.getElementById('btn-start').textContent = state.gameOver ? '重新修炼' : '开始修炼';
}

function getCell(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width, scaleY = H / rect.height;
  return {
    x: Math.floor((e.clientX - rect.left) * scaleX / CELL),
    y: Math.floor((e.clientY - rect.top) * scaleY / CELL)
  };
}

function startChain(cx, cy) {
  if (state.gameOver || state.levelTransition || paused) return;
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
  if (visited[cy][cx]) return;
  Audio.chainStart();
  chain = [{x: cx, y: cy}];
  linePath = [{x: cx * CELL + CELL/2, y: cy * CELL + CELL/2}];
}

function extendChain(cx, cy) {
  if (chain.length === 0) return;
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
  if (visited[cy][cx]) return;
  // Check same color and adjacent to last in chain
  const last = chain[chain.length - 1];
  if (grid[cy][cx] !== grid[last.y][last.x]) return;
  if (Math.abs(cx - last.x) + Math.abs(cy - last.y) !== 1) return;
  // Check not already in chain
  if (chain.some(c => c.x === cx && c.y === cy)) {
    // Remove back to this point
    while (chain.length > 0) {
      const popped = chain.pop();
      linePath.pop();
      if (popped.x === cx && popped.y === cy) break;
    }
    return;
  }
  chain.push({x: cx, y: cy});
  linePath.push({x: cx * CELL + CELL/2, y: cy * CELL + CELL/2});
  Audio.chainExtend();
}

function endChain() {
  if (chain.length < CONFIG.MIN_CHAIN) { chain = []; linePath = []; return; }
  // Eliminate
  const color = grid[chain[0].y][chain[0].x];
  const pts = chain.length * chain.length * 10;
  state.combo++;
  state.moves++;
  state.score += pts * state.combo;

  Audio.eliminate(chain.length);
  if (state.combo >= 3) Audio.combo();

  for (const c of chain) {
    visited[c.y][c.x] = true;
    const et = ENEMY_TYPES[color];
    spawnParticles(c.x * CELL + CELL/2, c.y * CELL + CELL/2, et.color, 6);
  }

  if (state.combo > 1) {
    addFloatText(linePath[0].x, linePath[0].y, `${state.combo}连击! x${state.combo}`, '#ffd700');
  }
  addFloatText(linePath[Math.floor(linePath.length/2)].x, linePath[Math.floor(linePath.length/2)].y, `+${pts * state.combo}`, ENEMY_TYPES[color].color);

  chain = []; linePath = [];

  // Check level complete - all visited
  let allClear = true;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!visited[y][x]) { allClear = false; break; }
  }
  if (allClear) {
    state.levelTransition = 90;
    state.score += 500 * state.level;
    state.level++;
    // Advance realm
    let lvlSum = 0;
    const prevRealm = state.realmIdx;
    for (let i = 0; i < REALMS.length; i++) {
      lvlSum += REALMS[i].levels;
      if (state.level <= lvlSum) { state.realmIdx = i; break; }
    }
    if (state.realmIdx !== prevRealm) Audio.levelUp();
    setTimeout(() => {
      genGrid();
      state.levelTransition = 0;
    }, 1500);
  }

  // Check if any moves left
  if (!allClear && !hasMovesLeft()) {
    state.lives--;
    state.combo = 0;
    if (state.lives <= 0) {
      state.gameOver = true;
      addFloatText(W/2, H/2 - 30, '灵力耗尽...', '#ff4444');
      setTimeout(() => {
        showOverlay('道心破碎', `最终得分: ${state.score}`, `境界: ${REALMS[state.realmIdx].name} · 第${state.level}关 · ${state.moves}步`);
      }, 1500);
    } else {
      genGrid();
      addFloatText(W/2, H/2, `重新布阵! 剩余 ${state.lives} 条命`, '#a855f7');
    }
  }
}

function hasMovesLeft() {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (visited[y][x]) continue;
    const color = grid[y][x];
    if ((x < COLS-1 && !visited[y][x+1] && grid[y][x+1] === color) ||
        (y < ROWS-1 && !visited[y+1][x] && grid[y+1][x] === color)) return true;
  }
  return false;
}

let isDragging = false;
function onMouseDown(e) { e.preventDefault(); isDragging = true; const c = getCell(e); startChain(c.x, c.y); }
function onMouseMove(e) { if (!isDragging) return; const c = getCell(e); extendChain(c.x, c.y); }
function onMouseUp(e) { isDragging = false; endChain(); }
function onTouchStart(e) { e.preventDefault(); const t = e.touches[0]; const c = getCell(t); startChain(c.x, c.y); }
function onTouchMove(e) { e.preventDefault(); const t = e.touches[0]; const c = getCell(t); extendChain(c.x, c.y); }
function onTouchEnd(e) { e.preventDefault(); endChain(); }

function updateUI() {
  document.getElementById('realm-name').textContent = REALMS[state.realmIdx].name;
  const colors = ['#e0e0e0', '#4ade80', '#ffd700', '#a855f7', '#ef4444', '#ff6b9d'];
  document.getElementById('realm-name').style.color = colors[state.realmIdx];
  document.getElementById('score-display').textContent = `得分: ${state.score}`;
  document.getElementById('level-display').textContent = `关卡: ${state.level}`;
  document.getElementById('combo-display').textContent = state.combo > 0 ? `🔥 连击: ${state.combo}` : '连击: 0';
  document.getElementById('moves-display').textContent = `步数: ${state.moves}`;
  document.getElementById('moves-display').innerHTML = `步数: ${state.moves}` + ' · ' + '❤️'.repeat(state.lives) + '🖤'.repeat(Math.max(0, 3 - state.lives));
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) particles.push({
    x, y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6 - 2,
    life: 20 + Math.random()*15, color, r: 2 + Math.random()*3
  });
}

function addFloatText(x, y, text, color) {
  floatTexts.push({ x, y, text, color, life: 50, vy: -2 });
}

// ─── Rendering ─────────────────────────────────
let time = 0;
particles = []; floatTexts = [];

function loop(ts) {
  time = ts * 0.001;
  ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H);
  drawStars();
  drawGrid();
  drawLine();
  drawParticles();
  drawFloatTexts();
  if (state.levelTransition > 0) drawLevelComplete();
  if (paused) drawPaused();
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
    ctx.globalAlpha = s.a * (0.5 + 0.5 * Math.sin(time * 0.3 + s.x * 10));
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = x * CELL, py = y * CELL;
    if (visited[y][x]) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(px, py, CELL, CELL);
    } else {
      const et = ENEMY_TYPES[grid[y][x]];
      const inChain = chain.some(c => c.x === x && c.y === y);
      ctx.fillStyle = inChain ? et.glow : 'rgba(30,30,50,0.8)';
      ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);

      // Enemy circle
      ctx.fillStyle = et.color;
      ctx.shadowColor = et.glow; ctx.shadowBlur = inChain ? 15 : 5;
      ctx.beginPath(); ctx.arc(px + CELL/2, py + CELL/2, CELL * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = `${CELL*0.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(et.icon, px + CELL/2, py + CELL/2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.strokeRect(px, py, CELL, CELL);
  }
}

function drawLine() {
  if (linePath.length < 2) return;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#4a9eff'; ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(linePath[0].x, linePath[0].y);
  for (let i = 1; i < linePath.length; i++) ctx.lineTo(linePath[i].x, linePath[i].y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw chain count
  if (chain.length >= CONFIG.MIN_CHAIN) {
    const last = linePath[linePath.length - 1];
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.fillText(`${chain.length}`, last.x, last.y - CELL * 0.4);
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

function drawFloatTexts() {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const ft = floatTexts[i];
    ft.y += ft.vy; ft.life--;
    if (ft.life <= 0) { floatTexts.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, ft.life / 15);
    ctx.fillStyle = ft.color; ctx.font = 'bold 18px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}

function drawLevelComplete() {
  const alpha = Math.min(1, (90 - state.levelTransition) / 30);
  ctx.fillStyle = `rgba(5,5,15,${alpha * 0.7})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('⚔️ 过关成功!', W/2, H/2 - 20);
  ctx.fillStyle = '#ccc'; ctx.font = '18px "Microsoft YaHei"';
  ctx.fillText(`第 ${state.level + 1} 关`, W/2, H/2 + 20);
  ctx.globalAlpha = 1;
}

init();
})();
