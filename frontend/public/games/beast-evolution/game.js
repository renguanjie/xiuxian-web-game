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
    eat() { this.play(400 + Math.random() * 200, 'sine', 0.08, 0.08); },
    hurt() { this.play(200, 'sawtooth', 0.2, 0.1); },
    evolve() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.3, 0.12), i * 100));
    },
    gameOver() {
      this.play(400, 'sine', 0.3, 0.12);
      setTimeout(() => this.play(300, 'sine', 0.3, 0.12), 200);
      setTimeout(() => this.play(200, 'sine', 0.5, 0.12), 400);
    },
  };

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const EVOLUTIONS = [
    { name: '灵兽幼崽', emoji: '🐛', minScore: 0, speed: 1.2 },
    { name: '灵蛇', emoji: '🐍', minScore: 100, speed: 1.3 },
    { name: '灵狐', emoji: '🦊', minScore: 300, speed: 1.4 },
    { name: '灵狼', emoji: '🐺', minScore: 600, speed: 1.5 },
    { name: '灵鹤', emoji: '🦅', minScore: 1000, speed: 1.6 },
    { name: '灵龙', emoji: '🐉', minScore: 1600, speed: 1.8 },
    { name: '神兽', emoji: '🦄', minScore: 2500, speed: 2.0 },
    { name: '混沌神兽', emoji: '🐲', minScore: 4000, speed: 2.2 },
  ];

  const ENEMY_TYPES = [
    { emoji: '🐛', minLevel: 0, score: 10, sizeMult: 0.6 },
    { emoji: '🦋', minLevel: 1, score: 20, sizeMult: 0.8 },
    { emoji: '🐍', minLevel: 2, score: 30, sizeMult: 0.9 },
    { emoji: '🦊', minLevel: 3, score: 50, sizeMult: 1.0 },
    { emoji: '🐺', minLevel: 4, score: 80, sizeMult: 1.2 },
    { emoji: '🦅', minLevel: 5, score: 120, sizeMult: 1.3 },
    { emoji: '🐉', minLevel: 6, score: 200, sizeMult: 1.5 },
  ];

  let player, enemies, particles;
  let score, hp, gameRunning, animFrame;
  let mouseX, mouseY, lastSpawn, spawnRate;
  let food = [], prevEvo = '', evoAnim = { active: false, timer: 0 };
  let paused = false;

  function getEvolution(s) {
    let evo = EVOLUTIONS[0];
    for (const e of EVOLUTIONS) { if (s >= e.minScore) evo = e; }
    return evo;
  }

  function getBaseSize(evoIdx) { return 18 + evoIdx * 4; }

  function spawnEnemy() {
    const playerEvo = getEvolution(score);
    const playerIdx = EVOLUTIONS.indexOf(playerEvo);
    const available = ENEMY_TYPES.filter(e => e.minLevel <= playerIdx + 1);
    const type = available[Math.floor(Math.random() * available.length)];
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const speed = 1 + Math.random() * 2;
    switch (side) {
      case 0: x = -20; y = Math.random() * canvas.height; vx = speed; vy = (Math.random() - 0.5) * 1.5; break;
      case 1: x = canvas.width + 20; y = Math.random() * canvas.height; vx = -speed; vy = (Math.random() - 0.5) * 1.5; break;
      case 2: x = Math.random() * canvas.width; y = -20; vx = (Math.random() - 0.5) * 1.5; vy = speed; break;
      case 3: x = Math.random() * canvas.width; y = canvas.height + 20; vx = (Math.random() - 0.5) * 1.5; vy = -speed; break;
    }
    const playerSize = getBaseSize(playerIdx);
    enemies.push({ x, y, vx, vy, emoji: type.emoji, score: type.score, size: playerSize * type.sizeMult * (0.7 + Math.random() * 0.6) });
  }

  function addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1, color, size: 3 + Math.random() * 4 });
    }
  }

  function spawnFood() {
    for (let i = 0; i < 15; i++) {
      food.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 4 + Math.random() * 3,
        emoji: Math.random() < 0.5 ? '🌿' : '✨',
        value: 5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function update() {
    const evo = getEvolution(score);
    const evoIdx = EVOLUTIONS.indexOf(evo);
    const playerSize = getBaseSize(evoIdx);

    // Evolution detection
    if (evo.name !== prevEvo) {
      prevEvo = evo.name;
      evoAnim = { active: true, timer: 120 };
      Audio.evolve();
    }
    if (evoAnim.active) { evoAnim.timer--; if (evoAnim.timer <= 0) evoAnim.active = false; }

    player.x += (mouseX - player.x) * 0.08 * evo.speed;
    player.y += (mouseY - player.y) * 0.08 * evo.speed;
    player.x = Math.max(playerSize, Math.min(canvas.width - playerSize, player.x));
    player.y = Math.max(playerSize, Math.min(canvas.height - playerSize, player.y));

    const now = performance.now();
    if (now - lastSpawn > spawnRate) {
      spawnEnemy();
      lastSpawn = now;
      spawnRate = Math.max(400, 1500 - score * 0.1);
    }

    // Maintain food count
    while (food.length < 15) spawnFood();

    // Food collection
    for (let i = food.length - 1; i >= 0; i--) {
      const f = food[i];
      const dx = f.x - player.x, dy = f.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < playerSize + f.size) {
        score += f.value;
        Audio.eat();
        addParticles(f.x, f.y, '#44ffaa', 3);
        food.splice(i, 1);
        updateUI();
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx;
      e.y += e.vy;
      if (e.x < -50 || e.x > canvas.width + 50 || e.y < -50 || e.y > canvas.height + 50) {
        enemies.splice(i, 1);
        continue;
      }
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < playerSize + e.size) {
        if (e.size <= playerSize * 1.1) {
          score += e.score;
          addParticles(e.x, e.y, '#44ddcc', 6);
          Audio.eat();
          enemies.splice(i, 1);
          updateUI();
        } else if (e.size > playerSize * 1.3) {
          hp--;
          addParticles(player.x, player.y, '#ff4444', 10);
          Audio.hurt();
          enemies.splice(i, 1);
          updateUI();
          if (hp <= 0) { endGame(); return; }
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createRadialGradient(player.x, player.y, 50, player.x, player.y, 300);
    grad.addColorStop(0, 'rgba(30, 60, 50, 0.3)');
    grad.addColorStop(1, 'rgba(10, 20, 30, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const e of enemies) {
      const isEdible = e.size <= player.size * 1.1;
      ctx.font = e.size * 1.6 + 'px sans-serif';
      ctx.globalAlpha = 0.9;
      ctx.fillText(e.emoji, e.x - e.size * 0.7, e.y + e.size * 0.5);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isEdible ? '#44ff44' : '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.font = player.size * 2 + 'px sans-serif';
    ctx.fillText(player.emoji, player.x - player.size, player.y + player.size * 0.7);
    ctx.strokeStyle = '#44ddcc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.stroke();
    if (paused) {
      ctx.fillStyle = 'rgba(5,5,15,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center';
      ctx.fillText('⏸️ 暂停', canvas.width/2, canvas.height/2);
      ctx.font = '16px "Microsoft YaHei"'; ctx.fillStyle = '#aaa';
      ctx.fillText('按 P 继续', canvas.width/2, canvas.height/2 + 30);
    }
  }

  function gameLoop() {
    if (!gameRunning || paused) return;
    update();
    draw();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('hp').textContent = hp;
    const evo = getEvolution(score);
    const nextEvo = EVOLUTIONS[EVOLUTIONS.indexOf(evo) + 1];
    const xpPct = nextEvo
      ? Math.min(100, ((score - evo.minScore) / (nextEvo.minScore - evo.minScore)) * 100)
      : 100;
    document.getElementById('xpFill').style.width = xpPct + '%';
    document.getElementById('levelBadge').textContent = evo.name;
  }

  function startGame() {
    document.getElementById('startOverlay').style.display = 'none';
    document.getElementById('endOverlay').style.display = 'none';
    const evo = EVOLUTIONS[0];
    player = { x: canvas.width / 2, y: canvas.height / 2, size: getBaseSize(0), emoji: evo.emoji };
    enemies = [];
    particles = [];
    score = 0; hp = 3;
    mouseX = canvas.width / 2; mouseY = canvas.height / 2;
    gameRunning = true;
    lastSpawn = performance.now();
    spawnRate = 1500;
    updateUI();
    if (animFrame) cancelAnimationFrame(animFrame);
    gameLoop();
  }

  function endGame() {
    gameRunning = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    const best = parseInt(localStorage.getItem('beast_evolution_best') || '0');
    const isNew = score > best;
    if (isNew) localStorage.setItem('beast_evolution_best', score);
    document.getElementById('finalScore').textContent = score + (isNew ? ' 🆕 最高纪录!' : '') + (best > 0 && !isNew ? ` (最高: ${best})` : '');
    document.getElementById('finalLevel').textContent = '最终形态：' + getEvolution(score).name;
    document.getElementById('endOverlay').style.display = 'flex';
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    Audio.init();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (touch.clientY - rect.top) * (canvas.height / rect.height);
  }, { passive: false });

  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') paused = !paused; });

  // Init
  player = { x: canvas.width / 2, y: canvas.height / 2, size: getBaseSize(0), emoji: '🐛' };
  enemies = [];
  particles = [];
  draw();

  window.startGame = startGame;
})();
