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
    jump() { this.play(300 + Math.random() * 100, 'sine', 0.1, 0.08); },
    spring() {
      this.play(500, 'sine', 0.08, 0.1);
      setTimeout(() => this.play(700, 'sine', 0.08, 0.1), 50);
      setTimeout(() => this.play(900, 'sine', 0.1, 0.1), 100);
    },
    collect() { this.play(800, 'triangle', 0.08, 0.1); },
    realmUp() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.25, 0.12), i * 120));
    },
    break_() { this.play(150, 'sawtooth', 0.15, 0.06); },
    gameOver() {
      this.play(400, 'sine', 0.3, 0.12);
      setTimeout(() => this.play(300, 'sine', 0.3, 0.12), 200);
      setTimeout(() => this.play(200, 'sine', 0.5, 0.12), 400);
    },
  };

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const REALMS = [
    { name: '凡人', minHeight: 0, emoji: '🧑' },
    { name: '炼气期', minHeight: 100, emoji: '🧘' },
    { name: '筑基期', minHeight: 300, emoji: '🏔️' },
    { name: '金丹期', minHeight: 600, emoji: '💎' },
    { name: '元婴期', minHeight: 1000, emoji: '👶' },
    { name: '化神期', minHeight: 1600, emoji: '✨' },
    { name: '合体期', minHeight: 2400, emoji: '🔮' },
    { name: '大乘期', minHeight: 3500, emoji: '🌟' },
    { name: '渡劫期', minHeight: 5000, emoji: '⚡' },
    { name: '飞升仙界', minHeight: 7000, emoji: '🌈' },
  ];

  const PLATFORM_TYPES = [
    { color: '#88cc44', width: 80, emoji: '☁️', name: '祥云' },
    { color: '#ff8844', width: 60, emoji: '🔥', name: '火灵台' },
    { color: '#4488ff', width: 100, emoji: '💨', name: '风台' },
    { color: '#ffcc44', width: 50, emoji: '⭐', name: '弹星' },
    { color: '#cc88ff', width: 40, emoji: '🌸', name: '灵花' },
  ];

  let player, platforms, cameraY, maxHeight, score;
  let gameRunning, animFrame;
  let keys = { left: false, right: false };
  let collectibles = [], particles = [];
  let prevRealm = '';
  let realmAnim = { active: false, timer: 0, text: '' };
  let paused = false;

  function getRealm(h) {
    let realm = REALMS[0];
    for (const r of REALMS) { if (h >= r.minHeight) realm = r; }
    return realm;
  }

  function generatePlatforms(fromY, toY) {
    const result = [];
    let y = fromY;
    while (y > toY) {
      const gap = 60 + Math.random() * 40 + (maxHeight > 1000 ? Math.min(maxHeight * 0.01, 30) : 0);
      y -= gap;
      const typeIdx = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * PLATFORM_TYPES.length);
      const type = PLATFORM_TYPES[typeIdx];
      const plat = {
        x: Math.random() * (canvas.width - type.width),
        y: y,
        width: type.width,
        height: 14,
        type: typeIdx,
        ...type,
        moveDir: typeIdx === 2 ? (Math.random() > 0.5 ? 1 : -1) : 0,
        moveSpeed: typeIdx === 2 ? 1 + Math.random() * 2 : 0,
        broken: false,
        springAnim: 0,
      };
      result.push(plat);

      // Spawn collectible above some platforms
      if (Math.random() < 0.15) {
        const isSpiritStone = Math.random() < 0.7;
        collectibles.push({
          x: plat.x + plat.width / 2,
          y: y - 30,
          emoji: isSpiritStone ? '💎' : '🍃',
          value: isSpiritStone ? 50 : 20,
          size: 12,
          collected: false,
          bobPhase: Math.random() * Math.PI * 2,
        });
      }
    }
    return result;
  }

  function startGame() {
    Audio.init();
    document.getElementById('startOverlay').style.display = 'none';
    document.getElementById('endOverlay').style.display = 'none';
    player = {
      x: canvas.width / 2 - 15,
      y: canvas.height - 80,
      width: 30,
      height: 30,
      vy: -10,
      vx: 0,
      emoji: '🧑',
      facing: 1,
    };
    cameraY = 0;
    maxHeight = 0;
    score = 0;
    gameRunning = true;
    collectibles = [];
    particles = [];
    prevRealm = REALMS[0].name;
    realmAnim = { active: false, timer: 0, text: '' };

    platforms = [{ x: canvas.width / 2 - 40, y: canvas.height - 30, width: 80, height: 14, type: 0, color: '#88cc44', emoji: '☁️', name: '祥云', moveDir: 0, moveSpeed: 0, broken: false, springAnim: 0 }];
    platforms = platforms.concat(generatePlatforms(canvas.height - 100, -canvas.height));

    if (animFrame) cancelAnimationFrame(animFrame);
    gameLoop();
  }

  function update() {
    const speed = 5;
    if (keys.left) { player.vx = -speed; player.facing = -1; }
    else if (keys.right) { player.vx = speed; player.facing = 1; }
    else { player.vx *= 0.85; }

    player.x += player.vx;
    if (player.x < 0) player.x = canvas.width - player.width;
    if (player.x > canvas.width) player.x = 0;

    player.vy += 0.4;
    player.y += player.vy;

    if (player.vy > 0) {
      for (const p of platforms) {
        if (p.broken) continue;
        if (player.x + player.width > p.x && player.x < p.x + p.width &&
            player.y + player.height > p.y && player.y + player.height < p.y + p.height + 10) {

          player.y = p.y - player.height;

          if (p.type === 3) {
            player.vy = -18;
            p.springAnim = 1;
            score += 20;
            Audio.spring();
          } else if (p.type === 1) {
            player.vy = -10;
            p.broken = true;
            Audio.break_();
          } else {
            player.vy = -10 - (maxHeight > 500 ? Math.min(maxHeight * 0.002, 2) : 0);
            Audio.jump();
          }
          break;
        }
      }
    }

    for (const p of platforms) {
      if (p.moveDir !== 0 && !p.broken) {
        p.x += p.moveSpeed * p.moveDir;
        if (p.x < 0 || p.x + p.width > canvas.width) p.moveDir *= -1;
      }
      if (p.springAnim > 0) p.springAnim -= 0.05;
    }

    // Collectible collection
    for (const c of collectibles) {
      if (c.collected) continue;
      const dx = (player.x + player.width / 2) - c.x;
      const dy = (player.y + player.height / 2) - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < player.width + c.size) {
        c.collected = true;
        score += c.value;
        Audio.collect();
        // Spawn particles
        for (let i = 0; i < 5; i++) {
          particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 1, color: c.emoji === '💎' ? '#44ddff' : '#44ff88', size: 3 + Math.random() * 3 });
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Smoother camera
    const targetCameraY = player.y - canvas.height * 0.4;
    if (targetCameraY < cameraY) {
      cameraY += (targetCameraY - cameraY) * 0.15;
    }

    const currentHeight = Math.floor((canvas.height - player.y) / 5);
    if (currentHeight > maxHeight) {
      maxHeight = currentHeight;
      score = maxHeight;

      // Realm change detection
      const currentRealm = getRealm(maxHeight).name;
      if (currentRealm !== prevRealm) {
        prevRealm = currentRealm;
        realmAnim = { active: true, timer: 90, text: currentRealm };
        Audio.realmUp();
      }
    }

    // Realm animation countdown
    if (realmAnim.active) {
      realmAnim.timer--;
      if (realmAnim.timer <= 0) realmAnim.active = false;
    }

    const highestPlat = Math.min(...platforms.map(p => p.y));
    if (highestPlat > cameraY - canvas.height) {
      platforms = platforms.concat(generatePlatforms(highestPlat - 20, cameraY - canvas.height * 2));
    }

    // Clean up off-screen platforms and collectibles
    platforms = platforms.filter(p => p.y - cameraY < canvas.height + 100);
    collectibles = collectibles.filter(c => !c.collected && c.y - cameraY < canvas.height + 100);

    if (player.y - cameraY > canvas.height + 50) {
      endGame();
    }

    player.emoji = getRealm(maxHeight).emoji;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const progress = Math.min(1, maxHeight / 7000);
    const r = Math.floor(10 + progress * 20);
    const g = Math.floor(10 + progress * 10);
    const b = Math.floor(40 + progress * 30);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 30 + Math.floor(progress * 50); i++) {
      const sx = (i * 73 + 17) % canvas.width;
      const sy = ((i * 137 + cameraY * 0.1) % (canvas.height + 100)) - 50;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    ctx.save();
    ctx.translate(0, -cameraY);

    for (const p of platforms) {
      if (p.broken) continue;
      const screenY = p.y - cameraY;
      if (screenY > canvas.height + 50 || screenY < -50) continue;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, p.height, 7);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (p.springAnim > 0) {
        ctx.globalAlpha = p.springAnim;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y - 10 * p.springAnim, 15 * p.springAnim, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.font = '16px sans-serif';
      ctx.fillText(p.emoji, p.x + p.width / 2 - 8, p.y - 4);
    }

    // Draw collectibles
    for (const c of collectibles) {
      if (c.collected) continue;
      const bob = Math.sin(time * 3 + c.bobPhase) * 4;
      ctx.font = `${c.size * 1.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(c.emoji, c.x, c.y + bob + 5);
      // Glow
      ctx.globalAlpha = 0.3 + Math.sin(time * 4 + c.bobPhase) * 0.15;
      ctx.fillStyle = c.emoji === '💎' ? '#44ddff' : '#44ff88';
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, c.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw particles
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw player
    const px = player.x, py = player.y;
    ctx.font = '28px sans-serif';
    ctx.save();
    ctx.translate(px + player.width / 2, py + player.height / 2);
    ctx.scale(player.facing, 1);
    ctx.fillText(player.emoji, -14, 10);
    ctx.restore();

    ctx.restore();

    // Realm change animation overlay
    if (realmAnim.active) {
      const alpha = Math.min(1, realmAnim.timer / 30);
      ctx.fillStyle = `rgba(10, 10, 26, ${alpha * 0.5})`;
      ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#cc88ff';
      ctx.font = 'bold 32px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.fillText('境界突破！', canvas.width / 2, canvas.height / 2 - 5);
      ctx.fillStyle = '#fff';
      ctx.font = '24px "Microsoft YaHei"';
      ctx.fillText(realmAnim.text, canvas.width / 2, canvas.height / 2 + 30);
      ctx.globalAlpha = 1;
    }
    if (paused) {
      ctx.fillStyle = 'rgba(5,5,15,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center';
      ctx.fillText('⏸️ 暂停', canvas.width/2, canvas.height/2);
      ctx.font = '16px "Microsoft YaHei"'; ctx.fillStyle = '#aaa';
      ctx.fillText('按 P 继续', canvas.width/2, canvas.height/2 + 30);
    }
  }

  // ─── Rendering ─────────────────────────────────
  let time = 0;

  function gameLoop() {
    if (!gameRunning || paused) return;
    time++;
    update();
    draw();
    updateUI();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('height').textContent = maxHeight;
    const realm = getRealm(maxHeight);
    document.getElementById('realmBadge').textContent = realm.name;
    const pct = Math.min(100, (maxHeight / 7000) * 100);
    document.getElementById('heightFill').style.width = pct + '%';
  }

  function endGame() {
    gameRunning = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    Audio.gameOver();
    const best = parseInt(localStorage.getItem('ascension_best') || '0');
    const isNew = score > best;
    if (isNew) localStorage.setItem('ascension_best', score);
    document.getElementById('finalScore').textContent = score + (isNew ? ' 🆕 最高纪录!' : '') + (best > 0 && !isNew ? ` (最高: ${best})` : '');
    document.getElementById('finalRealm').textContent = '最高境界：' + getRealm(maxHeight).name;
    document.getElementById('finalHeight').textContent = '攀登高度：' + maxHeight + 'm';
    document.getElementById('endOverlay').style.display = 'flex';
  }

  // Controls
  document.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P') { paused = !paused; return; }
    if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });

  // Touch controls
  let touchStartX = null;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    Audio.init();
    touchStartX = e.touches[0].clientX;
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (touchStartX !== null) {
      const dx = e.touches[0].clientX - touchStartX;
      keys.left = dx < -10;
      keys.right = dx > 10;
    }
  });
  canvas.addEventListener('touchend', () => {
    keys.left = false;
    keys.right = false;
    touchStartX = null;
  });

  document.getElementById('restartBtn').addEventListener('click', startGame);

  // roundRect polyfill
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      if (typeof r === 'number') r = [r, r, r, r];
      this.moveTo(x + r[0], y);
      this.lineTo(x + w - r[1], y);
      this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
      this.lineTo(x + w, y + h - r[2]);
      this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
      this.lineTo(x + r[3], y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
      this.lineTo(x, y + r[0]);
      this.quadraticCurveTo(x, y, x + r[0], y);
      this.closePath();
    };
  }

  // Initial display
  player = { x: canvas.width / 2, y: canvas.height - 80, width: 30, height: 30, vy: 0, vx: 0, emoji: '🧑', facing: 1 };
  cameraY = 0;
  platforms = [{ x: canvas.width / 2 - 40, y: canvas.height - 30, width: 80, height: 14, type: 0, color: '#88cc44', emoji: '☁️', name: '祥云', moveDir: 0, moveSpeed: 0, broken: false, springAnim: 0 }];
  draw();

  window.startGame = startGame;
})();
