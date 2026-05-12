// =============================================
// 挖矿仙人 - Mining Immortal
// 黄金矿工 + 扫雷 结合
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
  dig() { this.play(300 + Math.random() * 100, 'triangle', 0.06, 0.06); },
  reveal() { this.play(400, 'sine', 0.08, 0.05); },
  flag() { this.play(600, 'square', 0.06, 0.06); },
  bomb() {
    this.play(80, 'sawtooth', 0.3, 0.12);
    setTimeout(() => this.play(60, 'square', 0.2, 0.08), 50);
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

const CONFIG = { COLS: 15, ROWS: 12, CELL: 42, BOMB_RATIO: 0.18, MAX_MISTAKES: 3 };
const { COLS, ROWS, CELL } = CONFIG;
const HIDDEN = -1, EMPTY = 0, BOMB = 9;

const REALMS = [
  { name: '炼气期', targets: [100, 250, 400] }, { name: '筑基期', targets: [600, 800, 1100] },
  { name: '金丹期', targets: [1400, 1800, 2200] }, { name: '元婴期', targets: [2800, 3500, 4200] },
  { name: '化神期', targets: [5000, 6000, 7500] }, { name: '大乘期', targets: [9000, 11000, 13000] },
];

const TREASURES = [
  { name: '碎石', value: 5, color: '#888', icon: '🪨', weight: 40 },
  { name: '铁矿', value: 15, color: '#aaa', icon: '⛏️', weight: 25 },
  { name: '灵石', value: 30, color: '#4a9eff', icon: '💎', weight: 15 },
  { name: '金矿', value: 50, color: '#ffd700', icon: '🥇', weight: 10 },
  { name: '仙晶', value: 100, color: '#a855f7', icon: '🔮', weight: 5 },
  { name: '龙脉', value: 200, color: '#ff6b00', icon: '🐉', weight: 2 },
];

let canvas, ctx, W, H, state;
let paused = false;
let grid, revealed, flagged;
let particles, floatTexts;
let stars = [];
let firstClick = true;

function hasBombNeighbor(cx, cy) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx === 0 && dy === 0) continue;
    const nx = cx + dx, ny = cy + dy;
    if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && grid[ny][nx] === BOMB) return true;
  }
  return false;
}

function genGridSafe(safeX, safeY) {
  // Regenerate grid ensuring safe cell and its neighbors are not bombs
  grid = []; revealed = []; flagged = [];
  const bombCount = Math.floor(COLS * ROWS * CONFIG.BOMB_RATIO);
  const safeCells = new Set();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = safeX + dx, ny = safeY + dy;
    if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) safeCells.add(ny * COLS + nx);
  }

  const bombPositions = new Set();
  while (bombPositions.size < bombCount) {
    const pos = Math.floor(Math.random() * COLS * ROWS);
    if (!safeCells.has(pos)) bombPositions.add(pos);
  }

  for (let y = 0; y < ROWS; y++) {
    grid[y] = []; revealed[y] = []; flagged[y] = [];
    for (let x = 0; x < COLS; x++) {
      const idx = y * COLS + x;
      if (bombPositions.has(idx)) { grid[y][x] = BOMB; }
      else { const t = pickTreasure(); grid[y][x] = t.value; }
      revealed[y][x] = false; flagged[y][x] = false;
    }
  }
}

function resetState() {
  return { score: 0, realmIdx: 0, depth: 0, mistakes: 0, gameOver: false, won: false,
    hookAngle: 0, hookDir: 1, hookActive: false, hookTarget: null, hookProgress: 0,
    digging: false, digTimer: 0, digCell: null };
}

function pickTreasure() {
  const total = TREASURES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of TREASURES) { r -= t.weight; if (r <= 0) return t; }
  return TREASURES[0];
}

function genGrid() {
  grid = []; revealed = []; flagged = [];
  const bombCount = Math.floor(COLS * ROWS * CONFIG.BOMB_RATIO);
  const bombPositions = new Set();
  while (bombPositions.size < bombCount) bombPositions.add(Math.floor(Math.random() * COLS * ROWS));

  for (let y = 0; y < ROWS; y++) {
    grid[y] = []; revealed[y] = []; flagged[y] = [];
    for (let x = 0; x < COLS; x++) {
      const idx = y * COLS + x;
      if (bombPositions.has(idx)) { grid[y][x] = BOMB; }
      else { const t = pickTreasure(); grid[y][x] = t.value; }
      revealed[y][x] = false; flagged[y][x] = false;
    }
  }
  // Ensure player start area is safe
  for (let y = 0; y < 2; y++) for (let x = Math.floor(COLS/2)-1; x <= Math.floor(COLS/2)+1; x++) {
    if (x >= 0 && x < COLS && grid[y][x] === BOMB) { grid[y][x] = pickTreasure().value; }
  }
}

function countBombs(x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx === 0 && dy === 0) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && grid[ny][nx] === BOMB) count++;
  }
  return count;
}

function targetScore() {
  const r = REALMS[state.realmIdx];
  return r.targets[Math.min(state.depth, r.targets.length - 1)];
}

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 50; i++) stars.push({ x: Math.random(), y: Math.random()*0.3, r: Math.random()*1.5+0.5, a: Math.random()*0.5+0.1 });
  state = resetState();
  genGrid();
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('contextmenu', onRightClick);
  document.addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') paused = !paused; });
  // Mobile: long press for flagging
  let longPressTimer = null, longPressPos = null;
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    Audio.init();
    const t = e.touches[0];
    longPressPos = { x: t.clientX, y: t.clientY };
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      onRightClick({ preventDefault: () => {}, clientX: longPressPos.x, clientY: longPressPos.y });
    }, 500);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });
  canvas.addEventListener('touchmove', e => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });
  document.getElementById('btn-start').onclick = startGame;
  showOverlay('⛏️ 挖矿仙人', '探宝扫雷，挖出修仙资源');
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
  firstClick = true;
  document.getElementById('overlay-screen').classList.add('hidden');
}

function showOverlay(title, sub, info) {
  const o = document.getElementById('overlay-screen');
  o.classList.remove('hidden');
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-subtitle').textContent = sub || '';
  if (state && state.gameOver && state.score > 0) {
    const best = parseInt(localStorage.getItem('mine_best') || '0');
    const isNew = state.score > best;
    if (isNew) localStorage.setItem('mine_best', state.score);
    if (info) info += isNew ? ' 🆕 最高纪录!' : (best > 0 ? ` | 最高: ${best}` : '');
  }
  if (info) document.getElementById('overlay-info').textContent = info;
  else document.getElementById('overlay-info').innerHTML = '';
  document.getElementById('btn-start').textContent = state && state.gameOver ? '重新挖矿' : state && state.won ? '继续深造' : '开始挖矿';
}

function onClick(e) {
  if (state.gameOver || state.digging || paused) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width, scaleY = H / rect.height;
  const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
  const cx = Math.floor(mx / CELL), cy = Math.floor(my / CELL);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS || revealed[cy][cx]) return;

  // First click safety: regenerate if first click would be a bomb
  if (firstClick) {
    firstClick = false;
    if (grid[cy][cx] === BOMB || hasBombNeighbor(cx, cy)) {
      genGridSafe(cx, cy);
    }
  }

  Audio.dig();
  dig(cx, cy);
}

function onRightClick(e) {
  e.preventDefault();
  if (state.gameOver || state.digging) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width, scaleY = H / rect.height;
  const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
  const cx = Math.floor(mx / CELL), cy = Math.floor(my / CELL);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS || revealed[cy][cx]) return;
  flagged[cy][cx] = !flagged[cy][cx];
  Audio.flag();
}

function dig(cx, cy) {
  state.digging = true;
  state.digTimer = 20;
  state.digCell = { x: cx, y: cy };

  setTimeout(() => {
    revealed[cy][cx] = true;
    state.digging = false;

    if (grid[cy][cx] === BOMB) {
      Audio.bomb();
      state.mistakes++;
      spawnParticles(cx * CELL + CELL/2, cy * CELL + CELL/2, '#ff4400', 15);
      addFloatText(cx * CELL + CELL/2, cy * CELL + CELL/2, '💥 踩雷!', '#ff4400');
      if (state.mistakes >= CONFIG.MAX_MISTAKES) {
        state.gameOver = true;
        // Reveal all bombs
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (grid[y][x] === BOMB) revealed[y][x] = true;
        }
        setTimeout(() => showOverlay('💀 矿难身亡', `得分: ${state.score}`,
          `境界: ${REALMS[state.realmIdx].name} | 深度: ${state.depth}`), 1000);
        return;
      }
    } else {
      const val = grid[cy][cx];
      state.score += val;
      const t = TREASURES.find(t => t.value === val);
      Audio.reveal();
      spawnParticles(cx * CELL + CELL/2, cy * CELL + CELL/2, t ? t.color : '#ffd700', 8);
      addFloatText(cx * CELL + CELL/2, cy * CELL + CELL/2, `+${val} ${t ? t.icon : ''}`, t ? t.color : '#ffd700');

      // Auto-reveal neighbors if no adjacent bombs (minesweeper flood)
      if (countBombs(cx, cy) === 0) floodReveal(cx, cy);

      // Check level complete
      if (state.score >= targetScore()) {
        state.depth++;
        const prevRealm = state.realmIdx;
        const newRealm = getRealmIdx();
        if (newRealm > state.realmIdx) {
          state.realmIdx = newRealm;
          addFloatText(W/2, H/2, `突破至 ${REALMS[state.realmIdx].name}!`, '#ffd700');
          Audio.levelUp();
        }
        spawnParticles(W/2, H/2, '#ffd700', 30);
        setTimeout(() => { genGrid(); }, 800);
      }
    }
  }, 300);
}

function floodReveal(sx, sy) {
  const queue = [{x: sx, y: sy}];
  const visited = new Set();
  visited.add(`${sx},${sy}`);
  while (queue.length > 0) {
    const {x, y} = queue.shift();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !visited.has(key) && !revealed[ny][nx] && grid[ny][nx] !== BOMB) {
        visited.add(key);
        revealed[ny][nx] = true;
        if (countBombs(nx, ny) === 0) queue.push({x: nx, y: ny});
      }
    }
  }
}

function getRealmIdx() {
  let sum = 0;
  for (let i = 0; i < REALMS.length; i++) {
    sum += REALMS[i].targets.length;
    if (state.depth < sum) return i;
  }
  return REALMS.length - 1;
}

function updateUI() {
  document.getElementById('realm-name').textContent = REALMS[state.realmIdx].name;
  const colors = ['#e0e0e0', '#4ade80', '#ffd700', '#a855f7', '#ef4444', '#ff6b9d'];
  document.getElementById('realm-name').style.color = colors[state.realmIdx];
  document.getElementById('score-display').textContent = `得分: ${state.score}`;
  document.getElementById('depth-display').textContent = `深度: ${state.depth}`;
  document.getElementById('target-display').textContent = `目标: ${targetScore()}`;
  document.getElementById('mine-display').textContent = `💥 踩雷: ${state.mistakes}/${CONFIG.MAX_MISTAKES}`;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) particles.push({
    x, y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5 - 2,
    life: 25 + Math.random()*15, color, r: 2 + Math.random()*3
  });
}

function addFloatText(x, y, text, color) {
  floatTexts.push({ x, y, text, color, life: 60, vy: -1.5 });
}

// ─── Rendering ─────────────────────────────────
let time = 0;
particles = []; floatTexts = [];

function loop(ts) {
  time = ts * 0.001;
  ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H);
  drawStars();
  drawGrid();
  drawParticles();
  drawFloatTexts();
  if (state.digging) drawDigAnimation();
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
    if (revealed[y][x]) {
      if (grid[y][x] === BOMB) {
        ctx.fillStyle = '#2a0a0a'; ctx.fillRect(px, py, CELL, CELL);
        ctx.font = `${CELL*0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💥', px + CELL/2, py + CELL/2);
      } else if (grid[y][x] === 0) {
        ctx.fillStyle = '#1a1a28'; ctx.fillRect(px, py, CELL, CELL);
      } else {
        ctx.fillStyle = '#1a1a28'; ctx.fillRect(px, py, CELL, CELL);
        const bombs = countBombs(x, y);
        if (bombs > 0) {
          const bombColors = ['#4a9eff', '#4ade80', '#ef4444', '#a855f7', '#ffd700', '#ff6b00', '#ff6b9d', '#00ffff'];
          ctx.fillStyle = bombColors[bombs - 1];
          ctx.font = `bold ${CELL*0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(bombs, px + CELL/2, py + CELL/2);
        } else {
          const val = grid[y][x];
          const t = TREASURES.find(t => t.value === val);
          ctx.font = `${CELL*0.45}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(t ? t.icon : '💰', px + CELL/2, py + CELL/2);
          ctx.fillStyle = '#888'; ctx.font = `${CELL*0.22}px sans-serif`;
          ctx.fillText(`+${val}`, px + CELL/2, py + CELL * 0.82);
        }
      }
    } else {
      // Hidden tile
      const hover = false;
      ctx.fillStyle = flagged[y][x] ? '#3a2a1a' : '#3a3a4a';
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
      if (flagged[y][x]) {
        ctx.font = `${CELL*0.45}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🚩', px + CELL/2, py + CELL/2);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    ctx.strokeRect(px, py, CELL, CELL);
  }
}

function drawDigAnimation() {
  if (!state.digCell) return;
  const tx = state.digCell.x * CELL + CELL/2, ty = state.digCell.y * CELL + CELL/2;
  const progress = 1 - (state.digTimer / 20);
  const sx = COLS/2 * CELL + CELL/2, sy = 0;
  const cx = sx + (tx - sx) * progress, cy = sy + (ty - sy) * progress;
  // Hook line
  ctx.strokeStyle = '#cd853f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
  // Hook head
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life / 40;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life/40), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloatTexts() {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const ft = floatTexts[i];
    ft.y += ft.vy; ft.life--;
    if (ft.life <= 0) { floatTexts.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, ft.life / 20);
    ctx.fillStyle = ft.color; ctx.font = 'bold 16px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}

init();
})();
