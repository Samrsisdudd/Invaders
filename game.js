const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 400;

// ================= AUDIO CONTEXT =================
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function initAudio() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playShootSound() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playExplosionSound() {
  initAudio();
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  filter.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start();
}

// ================= STATE =================
let bullets = [];
let enemyBullets = [];
let enemies = [];
let bunkers = [];
let boss = null;

let keys = {};
let enemyDirection = 1;

let score = 0;
let lives = 3;
let level = 1;

let gameStarted = false;
let gameOver = false;

let shootTimer = 0;
let lastBossScore = 0;

let animationTimer = 0;
let animationFrame = 0;

// ================= PLAYER =================
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 50,
  width: 40,
  height: 20,
  speed: 5,
  dx: 0
};

// ================= IMAGES =================
const enemyImg = new Image();
enemyImg.src = "img/enemy.png";

const enemyImg2 = new Image();
enemyImg2.src = "img/enemy2.png";

const bossImg = new Image();
bossImg.src = "img/boss.png";

// ================= CREATE ENEMIES =================
function createEnemies() {
  enemies = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      enemies.push({
        x: 60 + i * 80,
        y: 40 + j * 60,
        width: 40,
        height: 40
      });
    }
  }
}

// ================= CREATE BUNKERS =================
function createBunkers() {
  bunkers = [];
  const bunkerCount = 4;
  const bunkerWidth = 48;
  const blockSize = 8;
  const spacing = (canvas.width - (bunkerCount * bunkerWidth)) / (bunkerCount + 1);

  for (let i = 0; i < bunkerCount; i++) {
    const startX = spacing + i * (bunkerWidth + spacing);
    const startY = canvas.height - 110;

    const shape = [
      [0, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [1, 1, 0, 0, 1, 1]
    ];

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          bunkers.push({
            x: startX + c * blockSize,
            y: startY + r * blockSize,
            width: blockSize,
            height: blockSize,
            life: 3
          });
        }
      }
    }
  }
}

// ================= INPUT (TECLAT) =================
document.addEventListener("keydown", e => {
  keys[e.code] = true;
  initAudio();

  if (!gameStarted && e.code === "Enter") {
    gameStarted = true;
    resetGame();
  }

  if (gameOver && e.code === "Enter") {
    resetGame();
  }

  if (e.code === "Space" && gameStarted && !gameOver) {
    shoot();
  }
});

document.addEventListener("keyup", e => {
  keys[e.code] = false;
});

// ================= INPUT (JOYSTICK I BOTÓ TÀCTIL) =================
const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
const shootBtn = document.getElementById('shoot');

let joystickActive = false;
const maxDistance = 35;

function handleJoystick(clientX) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  let deltaX = clientX - centerX;

  deltaX = Math.max(-maxDistance, Math.min(maxDistance, deltaX));
  stick.style.left = `${35 + deltaX}px`;

  player.dx = (deltaX / maxDistance) * player.speed;
}

function resetStick() {
  joystickActive = false;
  stick.style.left = '35px';
  player.dx = 0;
}

if (joystick && shootBtn) {
  joystick.addEventListener('touchstart', e => {
    initAudio();
    joystickActive = true;
    handleJoystick(e.touches[0].clientX);
  });

  joystick.addEventListener('touchmove', e => {
    if (joystickActive) handleJoystick(e.touches[0].clientX);
  });

  joystick.addEventListener('touchend', resetStick);

  shootBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    initAudio();
    if (!gameStarted || gameOver) {
      gameStarted = true;
      resetGame();
    } else {
      shoot();
    }
  });
}

// ================= SHOOT =================
function shoot() {
  bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10
  });
  playShootSound();
}

// ================= ENEMY SHOOT =================
function enemyShoot() {
  if (enemies.length === 0) return;

  const e = enemies[Math.floor(Math.random() * enemies.length)];

  enemyBullets.push({
    x: e.x + e.width / 2,
    y: e.y + e.height,
    width: 5,
    height: 10,
    speed: 3
  });
}

// ================= BOSS SHOOT =================
function bossShoot() {
  if (!boss) return;

  // Dispar central
  enemyBullets.push({
    x: boss.x + boss.width / 2 - 4,
    y: boss.y + boss.height,
    width: 8,
    height: 16,
    speed: 5
  });

  // Dispar diagonal esquerra
  enemyBullets.push({
    x: boss.x + 10,
    y: boss.y + boss.height,
    width: 6,
    height: 12,
    speed: 4,
    dx: -1.5
  });

  // Dispar diagonal dreta
  enemyBullets.push({
    x: boss.x + boss.width - 10,
    y: boss.y + boss.height,
    width: 6,
    height: 12,
    speed: 4,
    dx: 1.5
  });
}

// ================= BOSS =================
function spawnBoss() {
  boss = {
    x: canvas.width / 2 - 40,
    y: 30,
    width: 80,
    height: 80,
    life: 20,
    dir: 1,
    shootTimer: 0
  };
}

// ================= COLLISION =================
function hit(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ================= RESET =================
function resetGame() {
  bullets = [];
  enemyBullets = [];
  enemies = [];
  bunkers = [];
  boss = null;

  score = 0;
  lives = 3;
  level = 1;
  lastBossScore = 0;

  gameOver = false;
  player.x = canvas.width / 2 - 20;

  createEnemies();
  createBunkers();
}

// ================= UPDATE =================
function update() {
  if (!gameStarted || gameOver) return;

  // ===== PLAYER =====
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;
  player.x += player.dx;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // ===== BULLETS =====
  bullets.forEach(b => b.y -= 7);
  bullets = bullets.filter(b => b.y > 0);

  enemyBullets.forEach(b => {
    b.y += b.speed;
    if (b.dx) b.x += b.dx;
  });
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height && b.x > 0 && b.x < canvas.width);

  // ===== ANIMATION =====
  animationTimer++;
  if (animationTimer > 30) {
    animationFrame = animationFrame === 0 ? 1 : 0;
    animationTimer = 0;
  }

  // ===== ENEMIES MOVE =====
  let edge = false;
  enemies.forEach(e => {
    e.x += enemyDirection * (1 + level * 0.2);
    if (e.x < 0 || e.x + e.width > canvas.width) {
      edge = true;
    }
  });

  if (edge) {
    enemyDirection *= -1;
    enemies.forEach(e => e.y += 15);
  }

  // ===== ENEMIES REACH PLAYER OR BUNKERS =====
  enemies.forEach(e => {
    if (e.y + e.height >= player.y) {
      gameOver = true;
    }
    for (let buI = bunkers.length - 1; buI >= 0; buI--) {
      if (hit(e, bunkers[buI])) {
        bunkers.splice(buI, 1);
      }
    }
  });

  // ===== ENEMY SHOOT =====
  shootTimer++;
  if (shootTimer > Math.max(15, 60 - level * 5)) {
    enemyShoot();
    shootTimer = 0;
  }

  // ===== PLAYER HIT =====
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    if (hit(b, player)) {
      enemyBullets.splice(i, 1);
      lives--;
      playExplosionSound();
      if (lives <= 0) gameOver = true;
    }
  }

  // ===== BULLETS VS ENEMIES =====
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      if (hit(bullets[bi], enemies[ei])) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 10;
        playExplosionSound();
        break;
      }
    }
  }

  // ===== BULLETS VS BUNKERS =====
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    for (let buI = bunkers.length - 1; buI >= 0; buI--) {
      if (hit(bullets[bi], bunkers[buI])) {
        bunkers[buI].life--;
        bullets.splice(bi, 1);
        if (bunkers[buI].life <= 0) bunkers.splice(buI, 1);
        break;
      }
    }
  }

  // ===== ENEMY BULLETS VS BUNKERS =====
  for (let ebi = enemyBullets.length - 1; ebi >= 0; ebi--) {
    for (let buI = bunkers.length - 1; buI >= 0; buI--) {
      if (hit(enemyBullets[ebi], bunkers[buI])) {
        bunkers[buI].life--;
        enemyBullets.splice(ebi, 1);
        if (bunkers[buI].life <= 0) bunkers.splice(buI, 1);
        break;
      }
    }
  }

  // ===== BOSS SPAWN =====
  if (!boss && score > 0 && score % 200 === 0 && score !== lastBossScore) {
    spawnBoss();
    lastBossScore = score;
  }

  // ===== BOSS LOGIC =====
  if (boss) {
    boss.x += boss.dir * 2;
    if (boss.x < 0 || boss.x + boss.width > canvas.width) {
      boss.dir *= -1;
    }

    boss.shootTimer = (boss.shootTimer || 0) + 1;
    if (boss.shootTimer > 50) {
      bossShoot();
      boss.shootTimer = 0;
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      if (hit(bullets[i], boss)) {
        bullets.splice(i, 1);
        boss.life--;
        playExplosionSound();

        if (boss.life <= 0) {
          boss = null;
          score += 100;
        }
      }
    }
  }

  // ===== NEXT LEVEL =====
  if (enemies.length === 0 && !boss) {
    level++;
    createEnemies();
    createBunkers();
  }
}

// ================= DRAW =================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) {
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PREM ENTER O DISPARA PER COMENÇAR", canvas.width / 2, canvas.height / 2);
    return;
  }

  // PLAYER
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // BULLETS
  ctx.fillStyle = "white";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // ENEMY BULLETS
  ctx.fillStyle = "orange";
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // BUNKERS
  bunkers.forEach(b => {
    if (b.life === 3) ctx.fillStyle = "#00ff66";
    else if (b.life === 2) ctx.fillStyle = "#00aa44";
    else ctx.fillStyle = "#005522";

    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  // ENEMIES
  enemies.forEach(e => {
    const img = animationFrame === 0 ? enemyImg : enemyImg2;
    if (enemyImg.complete && enemyImg2.complete && enemyImg.naturalWidth !== 0) {
      ctx.drawImage(img, e.x, e.y, e.width, e.height);
    } else {
      ctx.fillStyle = "red";
      ctx.fillRect(e.x, e.y, e.width, e.height);
    }
  });

  // BOSS
  if (boss) {
    if (bossImg.complete && bossImg.naturalWidth !== 0) {
      ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    }

    // Barra de vida del Boss
    ctx.fillStyle = "red";
    ctx.fillRect(boss.x, boss.y - 10, boss.width, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(boss.x, boss.y - 10, (boss.width * boss.life) / 20, 5);
  }

  // UI
  ctx.fillStyle = "white";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 10, 20);
  ctx.fillText("Vides: " + lives, 10, 40);
  ctx.fillText("Nivell: " + level, 10, 60);

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText("Prem ENTER per reiniciar", canvas.width / 2, canvas.height / 2 + 40);
  }
}

// ================= LOOP =================
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// START GAME
createEnemies();
createBunkers();
loop();
