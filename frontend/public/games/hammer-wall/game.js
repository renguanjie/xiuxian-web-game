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
    move() { this.play(300, 'sine', 0.05, 0.05); },
    rotate() { this.play(500, 'triangle', 0.08, 0.06); },
    drop() { this.play(150, 'square', 0.15, 0.08); },
    lock() { this.play(250, 'triangle', 0.08, 0.06); },
    lineClear(n) {
      for (let i = 0; i < Math.min(n, 4); i++) {
        setTimeout(() => this.play(600 + i * 100, 'sine', 0.12, 0.1), i * 60);
      }
    },
    tetris() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.2, 0.12), i * 80));
    },
    gameOver() {
      this.play(400, 'sine', 0.3, 0.12);
      setTimeout(() => this.play(300, 'sine', 0.3, 0.12), 200);
      setTimeout(() => this.play(200, 'sine', 0.5, 0.12), 400);
    },
  };

  const COLS = 10, ROWS = 20, BLOCK = 24;
  const PIECES = [
    { shape: [[1,1,1,1]], color: '#00f0f0', emoji: '💧' },       // I - 水
    { shape: [[1,1],[1,1]], color: '#f0f000', emoji: '✨' },      // O - 金
    { shape: [[0,1,0],[1,1,1]], color: '#a000f0', emoji: '⚡' },  // T - 雷
    { shape: [[1,0,0],[1,1,1]], color: '#0000f0', emoji: '🌊' },  // L - 水
    { shape: [[0,0,1],[1,1,1]], color: '#f0a000', emoji: '🔥' },  // J - 火
    { shape: [[0,1,1],[1,1,0]], color: '#00f000', emoji: '🌿' },  // S - 木
    { shape: [[1,1,0],[0,1,1]], color: '#f00000', emoji: '🔥' },  // Z - 火
  ];

  const LEVELS = [
    { name: '炼气期', minLines: 0 },
    { name: '筑基期', minLines: 10 },
    { name: '金丹期', minLines: 25 },
    { name: '元婴期', minLines: 50 },
    { name: '化神期', minLines: 80 },
    { name: '合体期', minLines: 120 },
    { name: '大乘期', minLines: 160 },
    { name: '渡劫期', minLines: 200 },
  ];

  let board = [], currentPiece = null, nextPieceIdx = 0;
  let score = 0, lines = 0, gameRunning = false, dropInterval = 800;
  let lastDrop = 0, animFrame = null;
  let paused = false;
  let lineClearAnim = []; // rows being cleared
  let particles = [];

  const canvas = document.getElementById('gameBoard');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextPiece');
  const nextCtx = nextCanvas.getContext('2d');

  function getLevel(l) {
    let lvl = LEVELS[0];
    for (const v of LEVELS) { if (l >= v.minLines) lvl = v; }
    return lvl;
  }

  function newPiece() {
    const idx = nextPieceIdx !== null ? nextPieceIdx : Math.floor(Math.random() * PIECES.length);
    const p = PIECES[idx];
    nextPieceIdx = Math.floor(Math.random() * PIECES.length);
    currentPiece = {
      shape: p.shape.map(r => [...r]),
      color: p.color,
      emoji: p.emoji,
      x: Math.floor((COLS - p.shape[0].length) / 2),
      y: 0,
    };
    drawNext();
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, 80, 80);
    const p = PIECES[nextPieceIdx];
    const s = p.shape;
    const bSize = 16;
    const offX = (80 - s[0].length * bSize) / 2;
    const offY = (80 - s.length * bSize) / 2;
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (s[r][c]) {
          nextCtx.fillStyle = p.color;
          nextCtx.fillRect(offX + c * bSize, offY + r * bSize, bSize - 1, bSize - 1);
          nextCtx.font = '12px sans-serif';
          nextCtx.fillText(p.emoji, offX + c * bSize + 2, offY + r * bSize + 13);
        }
      }
    }
  }

  function rotate(shape) {
    const rows = shape.length, cols = shape[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        rotated[c][rows - 1 - r] = shape[r][c];
    return rotated;
  }

  function valid(shape, px, py) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = px + c, ny = py + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && board[ny][nx]) return false;
      }
    }
    return true;
  }

  function lock() {
    const { shape, color, emoji, x, y } = currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const by = y + r;
        if (by < 0) { endGame(); return; }
        board[by][x + c] = { color, emoji };
      }
    }
    clearLines();
    newPiece();
    if (!valid(currentPiece.shape, currentPiece.x, currentPiece.y)) {
      endGame();
    }
  }

  function clearLines() {
    let cleared = 0;
    const clearedRows = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(c => c !== null)) {
        clearedRows.push(r);
        // Spawn particles for this row
        for (let c = 0; c < COLS; c++) {
          const color = board[r][c]?.color || '#ffffff';
          for (let i = 0; i < 3; i++) {
            particles.push({
              x: c * BLOCK + BLOCK / 2, y: r * BLOCK + BLOCK / 2,
              vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 6,
              life: 1, color, size: 2 + Math.random() * 4,
            });
          }
        }
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // recheck this row
      }
    }
    if (cleared > 0) {
      if (cleared === 4) Audio.tetris();
      else Audio.lineClear(cleared);
      const pts = [0, 100, 300, 500, 800][cleared] || cleared * 200;
      score += pts;
      lines += cleared;
      dropInterval = Math.max(100, 800 - Math.floor(lines / 5) * 40);
      updateUI();
    }
  }

  function move(dx, dy) {
    if (valid(currentPiece.shape, currentPiece.x + dx, currentPiece.y + dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      if (dx !== 0) Audio.move();
      return true;
    }
    return false;
  }

  function hardDrop() {
    let dropped = 0;
    while (move(0, 1)) dropped++;
    lock();
    score += 20 + dropped;
    Audio.drop();
    updateUI();
  }

  function doRotate() {
    const rotated = rotate(currentPiece.shape);
    if (valid(rotated, currentPiece.x, currentPiece.y)) {
      currentPiece.shape = rotated;
    } else if (valid(rotated, currentPiece.x - 1, currentPiece.y)) {
      currentPiece.shape = rotated;
      currentPiece.x -= 1;
    } else if (valid(rotated, currentPiece.x + 1, currentPiece.y)) {
      currentPiece.shape = rotated;
      currentPiece.x += 1;
    }
    Audio.rotate();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#1a1a2a';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(COLS * BLOCK, r * BLOCK); ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, ROWS * BLOCK); ctx.stroke();
    }

    // Board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          ctx.fillStyle = board[r][c].color;
          ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          ctx.font = '14px sans-serif';
          ctx.fillText(board[r][c].emoji, c * BLOCK + 4, r * BLOCK + 17);
        }
      }
    }

    // Current piece
    if (currentPiece) {
      const { shape, color, emoji, x, y } = currentPiece;
      // Ghost
      let ghostY = y;
      while (valid(shape, x, ghostY + 1)) ghostY++;
      ctx.globalAlpha = 0.2;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            ctx.fillStyle = color;
            ctx.fillRect((x + c) * BLOCK + 1, (ghostY + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          }
        }
      }
      ctx.globalAlpha = 1;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            ctx.fillStyle = color;
            ctx.fillRect((x + c) * BLOCK + 1, (y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
            ctx.font = '14px sans-serif';
            ctx.fillText(emoji, (x + c) * BLOCK + 4, (y + r) * BLOCK + 17);
          }
        }
      }
    }

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pause overlay
    if (paused) {
      ctx.fillStyle = 'rgba(5,5,15,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center';
      ctx.fillText('⏸️ 暂停', canvas.width / 2, canvas.height / 2);
      ctx.font = '16px "Microsoft YaHei"'; ctx.fillStyle = '#aaa';
      ctx.fillText('按 P 继续', canvas.width / 2, canvas.height / 2 + 30);
    }
  }

  function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
    document.getElementById('levelBadge').textContent = getLevel(lines).name;
  }

  function gameLoop(ts) {
    if (!gameRunning || paused) { animFrame = requestAnimationFrame(gameLoop); return; }
    if (ts - lastDrop > dropInterval) {
      if (!move(0, 1)) lock();
      lastDrop = ts;
    }
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025;
      if (p.life <= 0) particles.splice(i, 1);
    }
    draw();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function endGame() {
    gameRunning = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    Audio.gameOver();
    const best = parseInt(localStorage.getItem('hammer_wall_best') || '0');
    const isNew = score > best;
    if (isNew) localStorage.setItem('hammer_wall_best', score);
    document.getElementById('finalScore').textContent = score + (isNew ? ' 🆕 最高纪录!' : '') + (best > 0 && !isNew ? ` (最高: ${best})` : '');
    document.getElementById('finalLevel').textContent = '境界：' + getLevel(lines).name;
    document.getElementById('finalLines').textContent = '消除层数：' + lines;
    document.getElementById('endOverlay').style.display = 'flex';
  }

  function startGame() {
    Audio.init();
    document.getElementById('startOverlay').style.display = 'none';
    document.getElementById('endOverlay').style.display = 'none';
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0; lines = 0; dropInterval = 800; lastDrop = 0;
    gameRunning = true;
    nextPieceIdx = null;
    particles = [];
    newPiece();
    updateUI();
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(gameLoop);
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!gameRunning) return;
    switch (e.key) {
      case 'ArrowLeft': move(-1, 0); e.preventDefault(); break;
      case 'ArrowRight': move(1, 0); e.preventDefault(); break;
      case 'ArrowDown': move(0, 1); score += 1; updateUI(); e.preventDefault(); break;
      case 'ArrowUp': doRotate(); e.preventDefault(); break;
      case ' ': hardDrop(); e.preventDefault(); break;
    }
    draw();
  });

  // Touch buttons
  document.getElementById('btnLeft').addEventListener('click', () => { if (gameRunning && !paused) { move(-1, 0); draw(); } });
  document.getElementById('btnRight').addEventListener('click', () => { if (gameRunning && !paused) { move(1, 0); draw(); } });
  document.getElementById('btnDown').addEventListener('click', () => { if (gameRunning && !paused) { move(0, 1); score += 1; updateUI(); draw(); } });
  document.getElementById('btnRotate').addEventListener('click', () => { if (gameRunning && !paused) { doRotate(); draw(); } });
  document.getElementById('btnDrop').addEventListener('click', () => { if (gameRunning && !paused) { hardDrop(); draw(); } });
  document.addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') { paused = !paused; draw(); } });

  // Init display
  initBoard();
  draw();

  window.startGame = startGame;
})();
