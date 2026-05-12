// ============================================
// 🗡️ 仙剑射击 - XianJian Shooter
// 踩踏仙剑，御剑飞行，发射飞剑，斩妖除魔
// ============================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ============================================
// 🔊 音效系统 (Web Audio API)
// ============================================
let audioCtx = null;
let soundEnabled = true;
let ambientOsc = null;
let ambientGain = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startAmbient();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle').textContent = soundEnabled ? '🔊' : '🔇';
  if (ambientGain) {
    ambientGain.gain.setTargetAtTime(soundEnabled ? 0.03 : 0, audioCtx.currentTime, 0.1);
  }
}

// 背景氛围音
function startAmbient() {
  if (!audioCtx) return;
  // 低频嗡鸣
  ambientOsc = audioCtx.createOscillator();
  ambientGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  ambientOsc.type = 'sine';
  ambientOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
  // 微微波动
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.setValueAtTime(0.3, audioCtx.currentTime);
  lfoGain.gain.setValueAtTime(5, audioCtx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(ambientOsc.frequency);
  lfo.start();
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, audioCtx.currentTime);
  
  ambientGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
  
  ambientOsc.connect(filter);
  filter.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);
  ambientOsc.start();
}

// 音效辅助函数
function playSound(type) {
  if (!audioCtx || !soundEnabled) return;
  
  switch (type) {
    case 'shoot': {
      // "嗖" - 快速频率下降
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
      break;
    }
    case 'hit': {
      // 爆炸 - 噪音 + 低频
      const bufferSize = audioCtx.sampleRate * 0.2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(2000, audioCtx.currentTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start();
      // 加上低频"咚"
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
      oscGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
      break;
    }
    case 'playerHit': {
      // 受伤 - 不和谐音
      const freqs = [200, 230, 180];
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      });
      break;
    }
    case 'powerup': {
      // 获得道具 - 上升音阶
      [523, 659, 784].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        const t = audioCtx.currentTime + i * 0.08;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
      break;
    }
    case 'bossWarning': {
      // Boss 警示 - 低沉警报
      for (let i = 0; i < 3; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        const t = audioCtx.currentTime + i * 0.4;
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.2);
        osc.frequency.linearRampToValueAtTime(200, t + 0.4);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      }
      break;
    }
    case 'bossDie': {
      // Boss 死亡 - 爆炸升级
      for (let i = 0; i < 4; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        const t = audioCtx.currentTime + i * 0.15;
        osc.frequency.setValueAtTime(400 - i * 80, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
      break;
    }
    case 'levelUp': {
      // 升级音
      [440, 554, 659, 880].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        const t = audioCtx.currentTime + i * 0.1;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
      break;
    }
    case 'gameOver': {
      // 游戏结束 - 下降音
      [440, 349, 294, 220].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        const t = audioCtx.currentTime + i * 0.2;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      break;
    }
  }
}

// ============================================
// 🏆 排行榜系统 (localStorage)
// ============================================
const LEADERBOARD_KEY = 'xianjian_leaderboard';

function getLeaderboard() {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(lb) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
}

function addScoreToLeaderboard(name, score) {
  const lb = getLeaderboard();
  const entry = {
    name: name || '修仙者',
    score,
    date: new Date().toLocaleDateString('zh-CN')
  };
  lb.push(entry);
  lb.sort((a, b) => b.score - a.score);
  const result = lb.slice(0, 10);
  saveLeaderboard(result);
  return result;
}

function renderLeaderboard(highlightScore) {
  const lb = getLeaderboard();
  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '';
  lb.forEach((entry, i) => {
    const tr = document.createElement('tr');
    if (highlightScore && entry.score === highlightScore && entry.date === new Date().toLocaleDateString('zh-CN')) {
      tr.className = 'highlight';
    }
    const tdName = document.createElement('td');
    tdName.textContent = entry.name;
    tr.appendChild(document.createElement('td')).textContent = i + 1;
    tr.appendChild(tdName);
    const tdScore = document.createElement('td');
    tdScore.textContent = entry.score.toLocaleString();
    tr.appendChild(tdScore);
    const tdDate = document.createElement('td');
    tdDate.textContent = entry.date;
    tr.appendChild(tdDate);
    tbody.appendChild(tr);
  });
  if (lb.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#90caf9;">暂无记录</td></tr>';
  }
}

function submitScore() {
  const nameInput = document.getElementById('player-name-input');
  const name = (nameInput.value || '修仙者').trim();
  addScoreToLeaderboard(name, game.score);
  renderLeaderboard(game.score);
  // 按钮反馈
  const btn = event.target;
  btn.textContent = '✅ 已保存';
  btn.disabled = true;
}

// ============================================
// 游戏状态
// ============================================
let game = {
  running: false,
  score: 0,
  lives: 3,
  level: 1,
  lastTime: 0,
  shootCooldown: 0,
  enemySpawnTimer: 0,
  difficultyTimer: 0,
  particles: [],
  bullets: [],
  enemies: [],
  powerups: [],
  stars: [],
  clouds: [],
  paused: false,
  bossActive: false,
  bossWarningTimer: 0,
  bossWarningActive: false,
  nextBossLevel: 3,
  levelUpTransition: false,
  levelUpTimer: 0
};

// 玩家
let player = {
  x: W / 2,
  y: H - 100,
  width: 40,
  height: 50,
  speed: 5,
  invincible: 0,
  powerLevel: 1
};

// 按键状态
const keys = {};
let mouseDown = false;
let shootCooldown = 0;

// ============================================
// 初始化
// ============================================
function init() {
  // 初始化背景星星
  game.stars = [];
  for (let i = 0; i < 80; i++) {
    game.stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.5 + Math.random() * 2,
      size: 1 + Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2
    });
  }
  
  // 初始化云朵
  game.clouds = [];
  for (let i = 0; i < 5; i++) {
    game.clouds.push({
      x: Math.random() * W,
      y: Math.random() * H,
      width: 60 + Math.random() * 80,
      height: 30 + Math.random() * 40,
      speed: 0.3 + Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.2
    });
  }
}

// ============================================
// 开始游戏
// ============================================
function startGame() {
  initAudio();
  
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('pause-screen').classList.add('hidden');
  document.getElementById('boss-warning').classList.add('hidden');
  
  game.running = true;
  game.paused = false;
  game.score = 0;
  game.lives = 3;
  game.level = 1;
  game.bullets = [];
  game.enemies = [];
  game.particles = [];
  game.powerups = [];
  game.enemySpawnTimer = 0;
  game.difficultyTimer = 0;
  game.bossActive = false;
  game.bossWarningTimer = 0;
  game.bossWarningActive = false;
  game.nextBossLevel = 3;
  game.levelUpTransition = false;
  game.levelUpTimer = 0;
  
  player.x = W / 2;
  player.y = H - 100;
  player.invincible = 0;
  player.powerLevel = 1;
  
  updateUI();
  game.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ============================================
// 游戏结束
// ============================================
function gameOver() {
  game.running = false;
  game.bossActive = false;
  playSound('gameOver');
  
  document.getElementById('final-score').textContent = `得分: ${game.score}`;
  document.getElementById('game-over-screen').classList.remove('hidden');
  
  // 渲染排行榜
  renderLeaderboard(null);
  
  // 重置按钮状态
  const saveBtn = document.querySelector('#game-over-screen .btn-small');
  if (saveBtn) {
    saveBtn.textContent = '保存成绩';
    saveBtn.disabled = false;
  }
}

// ============================================
// UI 更新
// ============================================
function updateUI() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('lives').textContent = '❤️'.repeat(game.lives);
  document.getElementById('level').textContent = game.level;
}

// ============================================
// 输入处理
// ============================================
document.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  
  // P 键暂停/继续
  if (e.key.toLowerCase() === 'p' && game.running) {
    togglePause();
  }
  
  if (e.key === ' ') e.preventDefault();
});

document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', () => mouseDown = true);
canvas.addEventListener('mouseup', () => mouseDown = false);

// 音效按钮
document.getElementById('sound-toggle').addEventListener('click', toggleSound);

// Mobile controls
(function() {
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  if (!joystick || !knob) return;
  let jActive = false;
  const jc = { x: 0, y: 0 };
  joystick.addEventListener('touchstart', e => {
    e.preventDefault(); initAudio(); jActive = true;
    const rect = joystick.getBoundingClientRect();
    jc.x = rect.left + rect.width / 2; jc.y = rect.top + rect.height / 2;
  });
  joystick.addEventListener('touchmove', e => {
    e.preventDefault(); if (!jActive) return;
    const t = e.touches[0];
    let dx = (t.clientX - jc.x) / 35, dy = (t.clientY - jc.y) / 35;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) { dx /= dist; dy /= dist; }
    knob.style.transform = `translate(calc(-50% + ${dx * 25}px), calc(-50% + ${dy * 25}px))`;
    keys['arrowleft'] = keys['a'] = dx < -0.3;
    keys['arrowright'] = keys['d'] = dx > 0.3;
    keys['arrowup'] = keys['w'] = dy < -0.3;
    keys['arrowdown'] = keys['s'] = dy > 0.3;
  });
  const resetJ = () => {
    jActive = false; knob.style.transform = 'translate(-50%, -50%)';
    keys['arrowleft'] = keys['a'] = false;
    keys['arrowright'] = keys['d'] = false;
    keys['arrowup'] = keys['w'] = false;
    keys['arrowdown'] = keys['s'] = false;
  };
  joystick.addEventListener('touchend', resetJ);
  joystick.addEventListener('touchcancel', resetJ);
  const fireBtn = document.getElementById('btn-fire-mobile');
  if (fireBtn) {
    fireBtn.addEventListener('touchstart', e => { e.preventDefault(); initAudio(); mouseDown = true; });
    fireBtn.addEventListener('touchend', e => { e.preventDefault(); mouseDown = false; });
  }
})();

// ============================================
// 暂停系统
// ============================================
function togglePause() {
  if (game.bossActive) return; // Boss 战禁止暂停
  if (!game.running) return;
  
  game.paused = !game.paused;
  
  if (game.paused) {
    document.getElementById('pause-screen').classList.remove('hidden');
  } else {
    document.getElementById('pause-screen').classList.add('hidden');
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// ============================================
// 游戏主循环
// ============================================
function gameLoop(timestamp) {
  if (!game.running || game.paused) return;
  
  const dt = Math.min((timestamp - game.lastTime) / 16.67, 2);
  game.lastTime = timestamp;
  
  update(dt);
  render();
  
  requestAnimationFrame(gameLoop);
}

// ============================================
// 更新逻辑
// ============================================
function update(dt) {
  // Boss 警告阶段
  if (game.bossWarningActive) {
    game.bossWarningTimer -= dt;
    if (game.bossWarningTimer <= 0) {
      game.bossWarningActive = false;
      game.levelUpTransition = false; // 关键修复：清除 levelUpTransition，防止敌人被意外清除
      document.getElementById('boss-warning').classList.add('hidden');
      spawnBoss();
    }
    return; // 警告期间暂停更新
  }
  
  // 关卡过渡阶段
  if (game.levelUpTransition) {
    game.levelUpTimer -= dt;
    if (game.levelUpTimer <= 0) {
      game.levelUpTransition = false;
      // 清除所有敌人
      game.enemies = [];
      game.bullets = game.bullets.filter(b => !b.isEnemy);
    }
    return; // 过渡期间暂停更新
  }
  
  // 玩家移动
  if (keys['arrowleft'] || keys['a']) player.x -= player.speed * dt;
  if (keys['arrowright'] || keys['d']) player.x += player.speed * dt;
  if (keys['arrowup'] || keys['w']) player.y -= player.speed * dt;
  if (keys['arrowdown'] || keys['s']) player.y += player.speed * dt;
  
  // 边界限制
  player.x = Math.max(player.width / 2, Math.min(W - player.width / 2, player.x));
  player.y = Math.max(player.height / 2, Math.min(H - player.height / 2, player.y));
  
  // 敌人生成计时器 (修复 Bug: spawnEnemy 从未被调用!)
  game.enemySpawnTimer -= dt;
  if (game.enemySpawnTimer <= 0) {
    spawnEnemy();
    // 随关卡提升，生成间隔缩短 (从 90 帧到最低 30 帧)
    game.enemySpawnTimer = Math.max(30, 90 - game.level * 5);
  }
  
  // 自动射击 (|| true = 始终自动开火)
  game.shootCooldown -= dt;
  if (true && game.shootCooldown <= 0) {
    shoot();
    game.shootCooldown = Math.max(8, 15 - game.level);
  }
  
  // 更新飞剑
  game.bullets = game.bullets.filter(b => {
    b.y -= (b.vy || b.speed) * dt;
    b.x += (b.vx || 0) * dt;
    if (b.trail) {
      b.trail.push({ x: b.x, y: b.y, life: 10 });
      b.trail = b.trail.filter(t => { t.life -= dt; return t.life > 0; });
    }
    return b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20;
  });
  
  // 更新敌人
  game.enemies = game.enemies.filter(e => {
    // Boss 特殊更新
    if (e.isBoss) {
      updateBoss(e, dt);
      return e.hp > 0;
    }
    
    e.y += e.speed * dt;
    e.x += Math.sin(e.wobble + e.y * 0.02) * e.wobbleSpeed;
    
    // 敌人射击
    if (e.shootTimer !== undefined) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        enemyShoot(e);
        e.shootTimer = e.shootInterval;
      }
    }
    
    return e.y < H + 50 && e.hp > 0;
  });
  
  // 更新道具 (修复 Bug: life 从未递减)
  game.powerups = game.powerups.filter(p => {
    p.y += p.speed * dt;
    p.life -= dt;
    return p.y < H + 20 && p.life > 0;
  });
  
  // 更新粒子
  game.particles = game.particles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vy += 0.05 * dt;
    return p.life > 0;
  });
  
  // 碰撞检测
  checkCollisions();
  
  // 升级检测 (非 Boss 战期间)
  if (!game.bossActive) {
    game.difficultyTimer += dt;
    if (game.difficultyTimer > 600) {
      game.level++;
      game.difficultyTimer = 0;
      updateUI();
      onLevelUp();
    }
  }
  
  // 无敌时间递减
  if (player.invincible > 0) player.invincible -= dt;
}

// ============================================
// 关卡升级处理
// ============================================
function onLevelUp() {
  playSound('levelUp');
  showFloatingText(`⚔️ 关卡 ${game.level}!`, W / 2, H / 2, '#ffd54f');
  
  // 检查是否触发 Boss 战
  if (game.level === game.nextBossLevel) {
    triggerBossWarning();
  }
}

// ============================================
// Boss 战系统
// ============================================
function triggerBossWarning() {
  game.bossWarningActive = true;
  game.bossWarningTimer = 120; // 2秒警告
  // 修复：不设置 levelUpTransition，避免 2 秒后再次清除敌人
  
  // 修复：不清除现有敌人和道具，让它们继续存在
  // 只清除敌人子弹
  game.bullets = game.bullets.filter(b => !b.isEnemy);
  
  // 显示警告界面
  const bossNames = ['千年狐妖', '九头蛇魔', '白骨精', '黑风大王', '金角大王', '牛魔王', '大鹏金翅雕'];
  const bossName = bossNames[(game.level / 3 - 1) % bossNames.length];
  document.getElementById('boss-warning-text').textContent = `${bossName} 出现了！`;
  document.getElementById('boss-warning').classList.remove('hidden');
  
  playSound('bossWarning');
}

function spawnBoss() {
  game.bossActive = true;
  
  const bossLevel = game.level / 3;
  const baseHP = 50 + bossLevel * 30;
  
  game.boss = {
    isBoss: true,
    x: W / 2,
    y: -80,
    targetY: 80,
    width: 120,
    height: 100,
    hp: baseHP,
    maxHp: baseHP,
    speed: 1,
    phase: 1, // 1 = 正常, 2 = 狂暴
    attackPattern: 0,
    attackTimer: 0,
    attackInterval: Math.max(30, 80 - bossLevel * 10),
    moveDir: 1,
    moveSpeed: 1.5,
    color: '#8b0000',
    score: baseHP * 20,
    enraged: false,
    enterTimer: 90, // 入场动画时间
    patternTimer: 0,
    patternInterval: 180
  };
  
  game.enemies.push(game.boss);
}

function updateBoss(boss, dt) {
  // 入场动画
  if (boss.enterTimer > 0) {
    boss.enterTimer -= dt;
    boss.y += (boss.targetY - boss.y) * 0.03 * dt;
    return;
  }
  
  // 左右移动
  boss.x += boss.moveDir * boss.moveSpeed * dt;
  if (boss.x < boss.width / 2 + 20) { boss.moveDir = 1; }
  if (boss.x > W - boss.width / 2 - 20) { boss.moveDir = -1; }
  
  // 阶段变化
  if (boss.hp <= boss.maxHp / 2 && boss.phase === 1) {
    boss.phase = 2;
    boss.enraged = true;
    boss.attackInterval = Math.max(15, boss.attackInterval - 20);
    boss.moveSpeed *= 1.5;
    boss.color = '#ff0000';
    showFloatingText('💀 Boss 狂暴!', W / 2, H / 2, '#ff1744');
    spawnParticles(boss.x, boss.y, '#ff0000', 30);
    playSound('bossWarning');
  }
  
  // 攻击计时
  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    bossAttack(boss);
    boss.attackTimer = boss.attackInterval;
  }
  
  // 切换攻击模式
  boss.patternTimer -= dt;
  if (boss.patternTimer <= 0) {
    boss.patternTimer = boss.patternInterval;
    boss.attackPattern = (boss.attackPattern + 1) % (boss.enraged ? 4 : 3);
  }
}

function bossAttack(boss) {
  const pattern = boss.attackPattern;
  const speed = boss.enraged ? 5 : 3.5;
  
  switch (pattern) {
    case 0: // 散射
      for (let i = -3; i <= 3; i++) {
        const angle = Math.PI / 2 + i * 0.2;
        game.bullets.push({
          x: boss.x,
          y: boss.y + boss.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          speed,
          width: 10,
          height: 10,
          trail: [],
          isEnemy: true,
          color: '#ff1744'
        });
      }
      break;
      
    case 1: // 追踪弹 (3发)
      for (let i = 0; i < 3; i++) {
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const spreadAngle = (i - 1) * 0.3;
        const baseAngle = Math.atan2(dy, dx) + spreadAngle;
        game.bullets.push({
          x: boss.x + Math.cos(baseAngle) * 30,
          y: boss.y + Math.sin(baseAngle) * 30,
          vx: Math.cos(baseAngle) * speed * 1.2,
          vy: Math.sin(baseAngle) * speed * 1.2,
          speed: speed * 1.2,
          width: 12,
          height: 12,
          trail: [],
          isEnemy: true,
          color: '#e040fb',
          homing: boss.enraged // 狂暴时追踪
        });
      }
      break;
      
    case 2: // 圆形弹幕
      const count = boss.enraged ? 16 : 12;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        game.bullets.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * speed * 0.8,
          vy: Math.sin(angle) * speed * 0.8,
          speed: speed * 0.8,
          width: 8,
          height: 8,
          trail: [],
          isEnemy: true,
          color: '#ff9100'
        });
      }
      break;
      
    case 3: // 激光 (仅狂暴模式)
      if (boss.enraged) {
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        game.bullets.push({
          x: boss.x,
          y: boss.y + boss.height / 2,
          vx: (dx / dist) * speed * 1.5,
          vy: (dy / dist) * speed * 1.5,
          speed: speed * 1.5,
          width: 16,
          height: 16,
          trail: [],
          isEnemy: true,
          color: '#ffea00'
        });
      }
      break;
  }
}

// ============================================
// 发射飞剑
// ============================================
function shoot() {
  playSound('shoot');
  const bulletSpeed = 10;
  
  if (player.powerLevel === 1) {
    game.bullets.push(createBullet(player.x, player.y - player.height / 2, 0, bulletSpeed));
  } else if (player.powerLevel === 2) {
    game.bullets.push(createBullet(player.x - 10, player.y - player.height / 2, 0, bulletSpeed));
    game.bullets.push(createBullet(player.x + 10, player.y - player.height / 2, 0, bulletSpeed));
  } else if (player.powerLevel >= 3) {
    game.bullets.push(createBullet(player.x, player.y - player.height / 2, 0, bulletSpeed));
    game.bullets.push(createBullet(player.x - 15, player.y - player.height / 2 + 5, -1, bulletSpeed * 0.95));
    game.bullets.push(createBullet(player.x + 15, player.y - player.height / 2 + 5, 1, bulletSpeed * 0.95));
  }
}

function createBullet(x, y, vx, vy) {
  return {
    x, y, vx, vy,
    speed: Math.abs(vy),
    width: 6,
    height: 20,
    trail: []
  };
}

// ============================================
// 敌人射击
// ============================================
function enemyShoot(e) {
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0) {
    game.bullets.push({
      x: e.x,
      y: e.y + e.height / 2,
      vx: (dx / dist) * 4,
      vy: (dy / dist) * 4,
      speed: 4,
      width: 8,
      height: 8,
      trail: [],
      isEnemy: true,
      color: '#e53935'
    });
  }
}

// ============================================
// 生成敌人
// ============================================
function spawnEnemy() {
  // 修复：Boss 战期间也生成小怪（降低生成频率）
  if (game.bossActive && Math.random() > 0.3) return;
  
  const types = ['small', 'medium', 'fast', 'tank'];
  const weights = [50, 25 + game.level * 2, 15 + game.level, 10 + game.level];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  
  let type = 'small';
  for (let i = 0; i < types.length; i++) {
    r -= weights[i];
    if (r <= 0) { type = types[i]; break; }
  }
  
  const enemy = {
    x: 30 + Math.random() * (W - 60),
    y: -40,
    type,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.5 + Math.random() * 1
  };
  
  switch (type) {
    case 'small':
      enemy.width = 30; enemy.height = 30;
      enemy.hp = 1; enemy.speed = 2;
      enemy.score = 100; enemy.color = '#e53935';
      break;
    case 'medium':
      enemy.width = 40; enemy.height = 40;
      enemy.hp = 3; enemy.speed = 1.5;
      enemy.score = 200; enemy.color = '#ff9800';
      enemy.shootTimer = 60; enemy.shootInterval = 90;
      break;
    case 'fast':
      enemy.width = 25; enemy.height = 25;
      enemy.hp = 1; enemy.speed = 4;
      enemy.score = 150; enemy.color = '#9c27b0';
      enemy.wobbleSpeed = 3;
      break;
    case 'tank':
      enemy.width = 50; enemy.height = 50;
      enemy.hp = 5 + game.level; enemy.speed = 0.8;
      enemy.score = 500; enemy.color = '#4caf50';
      enemy.shootTimer = 40; enemy.shootInterval = 60;
      break;
  }
  
  game.enemies.push(enemy);
}

// ============================================
// 碰撞检测
// ============================================
function checkCollisions() {
  // 飞剑 vs 敌人/Boss
  game.bullets = game.bullets.filter(b => {
    if (b.isEnemy) return true;
    let hit = false;
    game.enemies = game.enemies.filter(e => {
      if (hit) return true;
      const hitW = (b.width + e.width) / 2;  // 修复：碰撞检测公式
      const hitH = (b.height + e.height) / 2;
      if (Math.abs(b.x - e.x) < hitW && Math.abs(b.y - e.y) < hitH) {
        e.hp--;
        hit = true;
        spawnParticles(b.x, b.y, '#64b5f6', 5);
        
        if (e.hp <= 0) {
          if (e.isBoss) {
            // Boss 被击败
            onBossDefeated(e);
          } else {
            game.score += e.score;
            spawnParticles(e.x, e.y, e.color, 20);
            playSound('hit');
            if (Math.random() < 0.15) {
              spawnPowerup(e.x, e.y);
            }
          }
          updateUI();
        }
        return e.hp > 0;
      }
      return true;
    });
    return !hit;
  });
  
  // 敌人/敌人子弹 vs 玩家
  if (player.invincible <= 0) {
    // 敌人撞玩家
    game.enemies = game.enemies.filter(e => {
      if (e.isBoss) {
        // Boss 碰撞 - 更大的碰撞判定
        if (Math.abs(player.x - e.x) < (player.width + e.width) / 2 &&
            Math.abs(player.y - e.y) < (player.height + e.height) / 2) {
          playerHit();
          return true; // Boss 不消失
        }
        return true;
      }
      if (Math.abs(player.x - e.x) < (player.width + e.width) / 2 &&
          Math.abs(player.y - e.y) < (player.height + e.height) / 2) {
        playerHit();
        spawnParticles(e.x, e.y, e.color, 15);
        return false;
      }
      return true;
    });
    
    // 敌人子弹打玩家
    game.bullets = game.bullets.filter(b => {
      if (!b.isEnemy) return true;
      
      // 追踪弹更新
      if (b.homing) {
        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 300) {
          b.vx += (dx / dist) * 0.15;
          b.vy += (dy / dist) * 0.15;
          const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (spd > 0) {
            b.vx = (b.vx / spd) * b.speed;
            b.vy = (b.vy / spd) * b.speed;
          }
        }
      }
      
      if (Math.abs(player.x - b.x) < (player.width + b.width) / 2 &&
          Math.abs(player.y - b.y) < (player.height + b.height) / 2) {
        playerHit();
        return false;
      }
      return true;
    });
  }
  
  // 道具 vs 玩家
  game.powerups = game.powerups.filter(p => {
    if (Math.abs(player.x - p.x) < (player.width + p.width) / 2 &&
        Math.abs(player.y - p.y) < (player.height + p.height) / 2) {
      applyPowerup(p);
      return false;
    }
    return true;
  });
}

// ============================================
// Boss 被击败
// ============================================
function onBossDefeated(boss) {
  game.score += boss.score;
  game.bossActive = false;
  game.nextBossLevel = game.level + 3;
  
  // 大量粒子效果
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      spawnParticles(
        boss.x + (Math.random() - 0.5) * boss.width,
        boss.y + (Math.random() - 0.5) * boss.height,
        ['#ff0000', '#ff9100', '#ffd54f', '#e040fb'][Math.floor(Math.random() * 4)],
        30
      );
    }, i * 200);
  }
  
  playSound('bossDie');
  showFloatingText(`🎉 Boss 击败! +${boss.score}`, W / 2, H / 2, '#ffd54f');
  
  // 掉落多个道具
  for (let i = 0; i < 3; i++) {
    spawnPowerup(boss.x + (Math.random() - 0.5) * 60, boss.y);
  }
}

// ============================================
// 玩家受伤
// ============================================
function playerHit() {
  game.lives--;
  player.invincible = 90;
  spawnParticles(player.x, player.y, '#ff5722', 25);
  playSound('playerHit');
  updateUI();
  
  if (game.lives <= 0) {
    gameOver();
  }
}

// ============================================
// 道具系统
// ============================================
function spawnPowerup(x, y) {
  const types = ['power', 'life', 'score'];
  game.powerups.push({
    x, y,
    type: types[Math.floor(Math.random() * types.length)],
    width: 20, height: 20,
    speed: 1.5,
    life: 300
  });
}

function applyPowerup(p) {
  playSound('powerup');
  switch (p.type) {
    case 'power':
      player.powerLevel = Math.min(3, player.powerLevel + 1);
      showFloatingText('⚡ 飞剑升级!', player.x, player.y - 30, '#ffd54f');
      break;
    case 'life':
      game.lives = Math.min(5, game.lives + 1);
      showFloatingText('❤️ +1 生命', player.x, player.y - 30, '#f44336');
      break;
    case 'score':
      game.score += 500;
      showFloatingText('💯 +500', player.x, player.y - 30, '#64b5f6');
      break;
  }
  updateUI();
  spawnParticles(p.x, p.y, '#ffd54f', 10);
}

// ============================================
// 特效
// ============================================
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: 2 + Math.random() * 4
    });
  }
}

let floatingTexts = [];
function showFloatingText(text, x, y, color) {
  floatingTexts.push({ text, x, y, color, life: 90 });
}

// ============================================
// 渲染
// ============================================
function render() {
  // 清空画布
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, W, H);
  
  // 绘制蓝色天空渐变
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0d47a1');
  gradient.addColorStop(0.5, '#1565c0');
  gradient.addColorStop(1, '#1e88e5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  
  // 绘制星星
  game.stars.forEach(s => {
    s.y += s.speed;
    s.twinkle += 0.05;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    const alpha = 0.3 + 0.7 * Math.abs(Math.sin(s.twinkle));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 绘制云朵
  game.clouds.forEach(c => {
    c.y += c.speed;
    if (c.y > H + c.height) { c.y = -c.height; c.x = Math.random() * W; }
    ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity})`;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.width * 0.3, c.y + 5, c.width * 0.3, c.height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.width * 0.3, c.y + 3, c.width * 0.35, c.height * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 绘制飞剑拖尾
  game.bullets.forEach(b => {
    if (b.trail) {
      b.trail.forEach(t => {
        const alpha = t.life / 10;
        ctx.fillStyle = b.isEnemy 
          ? `rgba(229, 57, 53, ${alpha * 0.5})`
          : `rgba(100, 181, 246, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3 * alpha, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
  
  // 绘制飞剑
  game.bullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.isEnemy) {
      ctx.fillStyle = b.color || '#e53935';
      ctx.shadowColor = b.color || '#e53935';
    } else {
      ctx.fillStyle = '#64b5f6';
      ctx.shadowColor = '#1e88e5';
    }
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(3, 0);
    ctx.lineTo(1, 10);
    ctx.lineTo(-1, 10);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  
  // 绘制敌人
  game.enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    
    if (e.isBoss) {
      drawBoss(e);
    } else {
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      
      switch (e.type) {
        case 'small': drawSmallDemon(e); break;
        case 'medium': drawMediumDemon(e); break;
        case 'fast': drawFastDemon(e); break;
        case 'tank': drawTankDemon(e); break;
      }
    }
    
    ctx.restore();
  });
  
  // 绘制道具
  game.powerups.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.shadowBlur = 10;
    
    let emoji, color;
    switch (p.type) {
      case 'power': emoji = '⚡'; color = '#ffd54f'; break;
      case 'life': emoji = '❤️'; color = '#f44336'; break;
      case 'score': emoji = '💯'; color = '#64b5f6'; break;
    }
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);
    
    ctx.restore();
  });
  
  // 绘制玩家
  if (player.invincible <= 0 || Math.floor(player.invincible / 4) % 2 === 0) {
    drawPlayer();
  }
  
  // 绘制粒子 (修复 Bug: hex 颜色无法用 replace 转 rgba)
  game.particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    // 将 hex 颜色转为 rgba，支持 #RRGGBB 格式
    const hex = p.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 绘制浮动文字
  floatingTexts = floatingTexts.filter(ft => {
    ft.y -= 1;
    ft.life--;
    const alpha = ft.life / 90;
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'center';
    ctx.globalAlpha = alpha;
    // 使用白色描边确保可见性
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
    return ft.life > 0;
  });
  
  // Boss 血条
  if (game.bossActive && game.boss) {
    drawBossHealthBar(game.boss);
  }
}

// ============================================
// 绘制 Boss
// ============================================
function drawBoss(boss) {
  const t = performance.now() / 1000;
  const scale = boss.enterTimer > 0 ? 1 - boss.enterTimer / 90 : 1;
  const wobble = boss.enraged ? Math.sin(t * 10) * 3 : Math.sin(t * 3) * 1;
  
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(wobble, 0);
  
  // 身体 - 巨大的妖怪身躯
  const bodyColor = boss.enraged ? '#8b0000' : '#4a0000';
  ctx.fillStyle = bodyColor;
  ctx.shadowColor = boss.enraged ? '#ff0000' : '#8b0000';
  ctx.shadowBlur = boss.enraged ? 25 : 15;
  
  // 主体 (椭圆形)
  ctx.beginPath();
  ctx.ellipse(0, 0, boss.width / 2, boss.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 盔甲纹路
  ctx.strokeStyle = boss.enraged ? '#ff4444' : '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, boss.width / 2 - 10, boss.height / 2 - 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // 头部 - 巨大的妖怪脸
  ctx.fillStyle = boss.enraged ? '#ff1744' : '#6d4c41';
  ctx.beginPath();
  ctx.ellipse(0, -boss.height / 2 + 10, 30, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 角
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.moveTo(-20, -boss.height / 2 - 5);
  ctx.lineTo(-30, -boss.height / 2 - 35);
  ctx.lineTo(-10, -boss.height / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, -boss.height / 2 - 5);
  ctx.lineTo(30, -boss.height / 2 - 35);
  ctx.lineTo(10, -boss.height / 2);
  ctx.fill();
  
  // 眼睛 (发光)
  ctx.fillStyle = boss.enraged ? '#ff0000' : '#ffeb3b';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.ellipse(-12, -boss.height / 2 + 5, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, -boss.height / 2 + 5, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 瞳孔
  ctx.fillStyle = '#000';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(-12, -boss.height / 2 + 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(12, -boss.height / 2 + 5, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // 嘴巴
  ctx.fillStyle = boss.enraged ? '#b71c1c' : '#3e2723';
  ctx.beginPath();
  ctx.ellipse(0, -boss.height / 2 + 18, 15, 8, 0, 0, Math.PI);
  ctx.fill();
  
  // 牙齿
  ctx.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 6 - 3, -boss.height / 2 + 18);
    ctx.lineTo(i * 6, -boss.height / 2 + 24);
    ctx.lineTo(i * 6 + 3, -boss.height / 2 + 18);
    ctx.fill();
  }
  
  // 手臂/翅膀
  ctx.fillStyle = bodyColor;
  const armAngle = Math.sin(t * 2) * 0.3;
  // 左臂
  ctx.save();
  ctx.translate(-boss.width / 2 - 10, -10);
  ctx.rotate(-0.3 + armAngle);
  ctx.beginPath();
  ctx.ellipse(-20, 0, 25, 10, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 右臂
  ctx.save();
  ctx.translate(boss.width / 2 + 10, -10);
  ctx.rotate(0.3 - armAngle);
  ctx.beginPath();
  ctx.ellipse(20, 0, 25, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // 狂暴特效
  if (boss.enraged) {
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(t * 5) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.width / 2 + 15 + Math.sin(t * 4) * 5, boss.height / 2 + 10 + Math.cos(t * 3) * 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}

// ============================================
// Boss 血条
// ============================================
function drawBossHealthBar(boss) {
  const barWidth = W - 40;
  const barHeight = 16;
  const barX = 20;
  const barY = 45;
  
  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
  
  // 血条底色
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // 血量
  const hpRatio = boss.hp / boss.maxHp;
  const hpColor = boss.enraged ? '#ff1744' : '#f44336';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  
  // 狂暴分界线
  if (!boss.enraged) {
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barX + barWidth * 0.5, barY);
    ctx.lineTo(barX + barWidth * 0.5, barY + barHeight);
    ctx.stroke();
  }
  
  // 边框
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  
  // Boss 名字
  ctx.font = 'bold 12px Courier New';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`💀 Boss HP: ${boss.hp}/${boss.maxHp}`, W / 2, barY - 5);
}

// ============================================
// 绘制玩家（踩仙剑的修仙者）
// ============================================
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  
  // 仙剑光芒
  ctx.shadowColor = '#1e88e5';
  ctx.shadowBlur = 15;
  
  // 仙剑（脚下）
  ctx.fillStyle = '#64b5f6';
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(-20, 5);
  ctx.lineTo(-15, -5);
  ctx.lineTo(15, -5);
  ctx.lineTo(20, 5);
  ctx.closePath();
  ctx.fill();
  
  // 仙剑纹路
  ctx.strokeStyle = '#bbdefb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(15, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 15);
  ctx.stroke();
  
  // 修仙者身体
  ctx.shadowBlur = 5;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, -10, 8, 0, Math.PI * 2); // 头
  ctx.fill();
  
  // 道袍
  ctx.fillStyle = '#e3f2fd';
  ctx.beginPath();
  ctx.moveTo(-10, -5);
  ctx.lineTo(-12, 10);
  ctx.lineTo(12, 10);
  ctx.lineTo(10, -5);
  ctx.closePath();
  ctx.fill();
  
  // 腰带
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(-8, 0, 16, 3);
  
  ctx.restore();
}

// ============================================
// 绘制敌人
// ============================================
function drawSmallDemon(e) {
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-12, -5);
  ctx.lineTo(-8, 5);
  ctx.lineTo(0, 10);
  ctx.lineTo(8, 5);
  ctx.lineTo(12, -5);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-4, -2, 2, 0, Math.PI * 2);
  ctx.arc(4, -2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMediumDemon(e) {
  ctx.fillRect(-15, -15, 30, 30);
  
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-10, -15);
  ctx.lineTo(-15, -25);
  ctx.lineTo(-5, -15);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, -15);
  ctx.lineTo(15, -25);
  ctx.lineTo(5, -15);
  ctx.fill();
  
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-5, -3, 3, 0, Math.PI * 2);
  ctx.arc(5, -3, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawFastDemon(e) {
  ctx.beginPath();
  ctx.arc(0, -5, 12, Math.PI, 0);
  ctx.lineTo(12, 10);
  ctx.lineTo(6, 5);
  ctx.lineTo(0, 10);
  ctx.lineTo(-6, 5);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-4, -5, 3, 0, Math.PI * 2);
  ctx.arc(4, -5, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawTankDemon(e) {
  ctx.beginPath();
  ctx.arc(0, -5, 20, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -5, 15, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.fillStyle = '#ff0';
  ctx.beginPath();
  ctx.arc(-7, -8, 4, 0, Math.PI * 2);
  ctx.arc(7, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(0, 5, 6, 0, Math.PI);
  ctx.fill();
}

// ============================================
// 启动初始化
// ============================================
init();

// 暴露全局函数
window.startGame = startGame;
window.submitScore = submitScore;
