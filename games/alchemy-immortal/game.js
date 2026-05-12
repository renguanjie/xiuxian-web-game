// =============================================
// 炼丹仙人 - Alchemy Match-3
// =============================================
(function() {
'use strict';

// ─── Audio System ──────────────────────────────
const Audio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  play(freq, type, duration, volume = 0.15) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  select() { this.play(600, 'sine', 0.08, 0.1); },
  swap() { this.play(400, 'triangle', 0.12, 0.1); },
  match(combo) {
    const base = 500 + combo * 80;
    this.play(base, 'sine', 0.2, 0.12);
    setTimeout(() => this.play(base * 1.25, 'sine', 0.15, 0.1), 60);
  },
  combo() {
    this.play(800, 'square', 0.1, 0.08);
    setTimeout(() => this.play(1000, 'square', 0.1, 0.08), 80);
    setTimeout(() => this.play(1200, 'square', 0.15, 0.08), 160);
  },
  invalid() { this.play(200, 'sawtooth', 0.15, 0.06); },
  gameOver() {
    this.play(400, 'sine', 0.3, 0.12);
    setTimeout(() => this.play(300, 'sine', 0.3, 0.12), 200);
    setTimeout(() => this.play(200, 'sine', 0.5, 0.12), 400);
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.play(f, 'sine', 0.2, 0.1), i * 100);
    });
  }
};

// 游戏配置
const ROWS = 8, COLS = 8, GAME_TIME = 60;
const ELEMENTS = [
  { type: 'fire', emoji: '🔥' },
  { type: 'water', emoji: '💧' },
  { type: 'wood', emoji: '🌿' },
  { type: 'metal', emoji: '⚙️' },
  { type: 'earth', emoji: '🪨' },
  { type: 'thunder', emoji: '⚡' },
];

const LEVELS = [
  { name: '炼气期', minScore: 0 },
  { name: '筑基期', minScore: 300 },
  { name: '金丹期', minScore: 800 },
  { name: '元婴期', minScore: 1500 },
  { name: '化神期', minScore: 2500 },
  { name: '合体期', minScore: 4000 },
  { name: '大乘期', minScore: 6000 },
  { name: '渡劫期', minScore: 8000 },
];

let board = [], selected = null, score = 0, combo = 0, maxCombo = 0;
let paused = false;
let timeLeft = GAME_TIME, timer = null, gameRunning = false;
let hintTimer = null, hintCell = null;
let prevLevel = LEVELS[0].name;

function getLevel(s) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (s >= l.minScore) lvl = l; }
  return lvl;
}

function randomElement() { return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]; }

function initBoard() {
  board = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      let el;
      do { el = randomElement(); } while (
        (c >= 2 && board[r][c-1].type === el.type && board[r][c-2].type === el.type) ||
        (r >= 2 && board[r-1][c].type === el.type && board[r-2][c].type === el.type)
      );
      board[r][c] = { ...el };
    }
  }
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      const isHint = hintCell && hintCell.r === r && hintCell.c === c;
      cell.className = 'cell' + (selected && selected.r === r && selected.c === c ? ' selected' : '') + (isHint ? ' hint' : '');
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.dataset.type = board[r][c].type;
      cell.textContent = board[r][c].emoji;
      cell.addEventListener('click', () => onCellClick(r, c));
      cell.addEventListener('touchend', (e) => { e.preventDefault(); onCellClick(r, c); });
      boardEl.appendChild(cell);
    }
  }
}

function onCellClick(r, c) {
  if (!gameRunning || paused) return;
  clearHint();
  resetHintTimer();
  if (!selected) {
    selected = { r, c };
    Audio.select();
    renderBoard();
    return;
  }
  const dr = Math.abs(selected.r - r), dc = Math.abs(selected.c - c);
  if (dr + dc === 1) {
    Audio.swap();
    swapAndCheck(selected.r, selected.c, r, c);
  } else {
    Audio.select();
  }
  selected = { r, c };
  renderBoard();
}

function swapAndCheck(r1, c1, r2, c2) {
  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
  const matches = findAllMatches();
  if (matches.length > 0) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    processMatches(matches);
  } else {
    [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
    combo = 0;
    renderBoard();
  }
}

function findAllMatches() {
  const matched = new Set();
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      if (board[r][c].type === board[r][c+1].type && board[r][c].type === board[r][c+2].type) {
        let end = c + 2;
        while (end + 1 < COLS && board[r][end+1].type === board[r][c].type) end++;
        for (let i = c; i <= end; i++) matched.add(`${r},${i}`);
      }
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      if (board[r][c].type === board[r+1][c].type && board[r][c].type === board[r+2][c].type) {
        let end = r + 2;
        while (end + 1 < ROWS && board[end+1][c].type === board[r][c].type) end++;
        for (let i = r; i <= end; i++) matched.add(`${i},${c}`);
      }
    }
  }
  return [...matched].map(s => { const [r, c] = s.split(',').map(Number); return { r, c }; });
}

// Find a valid swap move for hint
function findHintMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Try swap right
      if (c + 1 < COLS) {
        [board[r][c], board[r][c+1]] = [board[r][c+1], board[r][c]];
        if (findAllMatches().length > 0) {
          [board[r][c], board[r][c+1]] = [board[r][c+1], board[r][c]];
          return [{ r, c }, { r, c: c + 1 }];
        }
        [board[r][c], board[r][c+1]] = [board[r][c+1], board[r][c]];
      }
      // Try swap down
      if (r + 1 < ROWS) {
        [board[r][c], board[r+1][c]] = [board[r+1][c], board[r][c]];
        if (findAllMatches().length > 0) {
          [board[r][c], board[r+1][c]] = [board[r+1][c], board[r][c]];
          return [{ r, c }, { r: r + 1, c }];
        }
        [board[r][c], board[r+1][c]] = [board[r+1][c], board[r][c]];
      }
    }
  }
  return null;
}

// Check if any valid moves remain
function hasValidMoves() {
  return findHintMove() !== null;
}

// Shuffle board when no moves available
function shuffleBoard() {
  const flat = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      flat.push(board[r][c]);
  // Fisher-Yates shuffle
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }
  let idx = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      board[r][c] = flat[idx++];
  // If still no moves or has initial matches, reinit
  if (!hasValidMoves() || findAllMatches().length > 0) {
    initBoard();
  }
}

// Show hint
function showHint() {
  if (!gameRunning || hintCell) return;
  const move = findHintMove();
  if (move) {
    hintCell = move[0];
    renderBoard();
    // Highlight hint after render
    requestAnimationFrame(() => {
      const boardEl = document.getElementById('board');
      const cells = boardEl.querySelectorAll('.cell');
      const idx = hintCell.r * COLS + hintCell.c;
      if (cells[idx]) {
        cells[idx].style.boxShadow = '0 0 15px rgba(100, 200, 255, 0.8)';
        cells[idx].style.animation = 'pulse 1s ease-in-out';
      }
    });
  }
}

function clearHint() {
  hintCell = null;
  if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
}

function resetHintTimer() {
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(showHint, 3000);
}

function processMatches(matches) {
  const pts = matches.length * 10 * (1 + combo * 0.5);
  score += Math.floor(pts);

  // Audio feedback
  if (combo >= 3) Audio.combo();
  else Audio.match(combo);

  // Check for level up
  const newLevel = getLevel(score).name;
  if (newLevel !== prevLevel) {
    prevLevel = newLevel;
    Audio.levelUp();
  }

  showComboPopup(matches, pts);

  // Remove matched
  for (const m of matches) {
    board[m.r][m.c] = null;
  }

  // Gravity
  for (let c = 0; c < COLS; c++) {
    let writePos = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) {
        board[writePos][c] = board[r][c];
        if (writePos !== r) board[r][c] = null;
        writePos--;
      }
    }
    for (let r = writePos; r >= 0; r--) {
      board[r][c] = randomElement();
    }
  }

  renderBoard();

  // Check for chain reactions
  setTimeout(() => {
    const newMatches = findAllMatches();
    if (newMatches.length > 0) {
      processMatches(newMatches);
    } else {
      combo = 0;
      updateUI();
      // Check if any valid moves remain
      if (!hasValidMoves()) {
        shuffleBoard();
        renderBoard();
      }
    }
  }, 350);
}

function showComboPopup(matches, pts) {
  const boardEl = document.getElementById('board');
  const rect = boardEl.getBoundingClientRect();
  const cellW = rect.width / COLS, cellH = rect.height / ROWS;
  const mid = matches[Math.floor(matches.length / 2)];

  const popup = document.createElement('div');
  popup.className = 'combo-popup';
  popup.textContent = `+${Math.floor(pts)}` + (combo > 1 ? ` x${combo}连!` : '');
  popup.style.left = mid.c * cellW + cellW / 2 - 30 + 'px';
  popup.style.top = mid.r * cellH + 'px';
  boardEl.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('time').textContent = timeLeft;
  document.getElementById('combo').textContent = combo;
  document.getElementById('timerFill').style.width = (timeLeft / GAME_TIME * 100) + '%';
  const lvl = getLevel(score);
  document.getElementById('levelBadge').textContent = lvl.name;
}

function startGame() {
  Audio.init();
  document.getElementById('startOverlay').style.display = 'none';
  document.getElementById('endOverlay').style.display = 'none';
  score = 0; combo = 0; maxCombo = 0; timeLeft = GAME_TIME;
  selected = null; gameRunning = true; hintCell = null;
  prevLevel = LEVELS[0].name;
  initBoard();
  renderBoard();
  updateUI();

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    updateUI();
    if (timeLeft <= 0) {
      gameRunning = false;
      clearInterval(timer);
      if (hintTimer) clearTimeout(hintTimer);
      Audio.gameOver();
      endGame();
    }
  }, 1000);

  // Start hint timer
  resetHintTimer();
}

function endGame() {
  const best = parseInt(localStorage.getItem('alchemy_immortal_best') || '0');
  const isNew = score > best;
  if (isNew) localStorage.setItem('alchemy_immortal_best', score);
  document.getElementById('finalScore').textContent = score + (isNew ? ' 🆕 最高纪录!' : '') + (best > 0 && !isNew ? `\n最高纪录: ${best}` : '');
  document.getElementById('finalLevel').textContent = '境界：' + getLevel(score).name;
  document.getElementById('maxCombo').textContent = '最大连击：' + maxCombo;
  document.getElementById('endOverlay').style.display = 'flex';
}

document.getElementById('restartBtn').addEventListener('click', startGame);
document.addEventListener('keydown', e => {
  if (e.key === 'p' || e.key === 'P') {
    paused = !paused;
    const po = document.getElementById('pause-overlay');
    if (po) po.classList.toggle('show', paused);
  }
});

// Initialize display
initBoard();
renderBoard();

// Expose to global for HTML onclick
window.startGame = startGame;
})();
