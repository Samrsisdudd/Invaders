const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 400;

// ================= STATE =================
let bullets = [];
let enemyBullets = [];
let enemies = [];
let boss = null;

let keys = {};
let enemyDirection = 1;

let gameStarted = false;
let gameOver = false;

let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lives = 3;
let level = 1;

let shootTimer = 0;
let lastBossScore = 0;

// animació enemics
let animationTimer = 0;
let animationFrame = 0;

// animació boss
let bossAnimationTimer = 0;
let bossAnimationFrame = 0;

// ================= PLAYER =================
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 50,
  width: 40,
  height: 20,
  speed: 5
};

// ================= IMAGES =================
const enemyImg = new Image();
enemyImg.src = "img/enemy.png";

const enemyImg2 = new Image();
enemyImg2.src = "img/enemy2.png";

const bossImg = new Image();
bossImg.src = "img/boss.png";

const bossImg2 = new Image();
bossImg2.src = "img/boss2.png";

// ================= SOUNDS =================
const shootSound = new Audio("sounds/shoot.mp3");
const explosionSound = new Audio("sounds/explosion.mp3");
const hitSound = new Audio("sounds/hit.mp3");

shootSound.volume = 0.3;
explosionSound.volume = 0.5;
hitSound.volume = 0.7;

// ================= CREATE ENEMIES =================
function createEnemies() {
  enemies = [];

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      enemies.push({
        x: 60 + i * 80,
        y: 40 + j * 60,
        width: 50,
        height: 50
      });
    }
  }
}

// ================= CONTROLS =================
document.addEventListener("keydown", e => {

  keys[e.code] = true;

  if (!gameStarted && e.code === "Enter") {
    gameStarted = true;
    resetGame();
  }

  if (gameOver && e.code === "Enter") {
    resetGame();
  }

  if (e.code === "Space" && gameStarted && !gameOver) {

    shootSound.currentTime = 0;
    shootSound.play().catch(() => {});

    bullets.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 10
    });
  }
});

document.addEventListener("keyup", e => {
  keys[e.code] = false;
});

// ================= MOBILE CONTROLS =================
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const shootBtn = document.getElementById("shootBtn");

// LEFT
leftBtn.addEventListener("touchstart", e => {
  e.preventDefault();
  keys["ArrowLeft"] = true;
});

leftBtn.addEventListener("touchend", e => {
  e.preventDefault();
  keys["ArrowLeft"] = false;
});

// RIGHT
rightBtn.addEventListener("touchstart", e => {
  e.preventDefault();
  keys["ArrowRight"] = true;
});

rightBtn.addEventListener("touchend", e => {
  e.preventDefault();
  keys["ArrowRight"] = false;
});

// SHOOT
shootBtn.addEventListener("touchstart", e => {

  e.preventDefault();

  if (!gameStarted) {
    gameStarted = true;
    resetGame();
  }

  if (gameOver) {
    resetGame();
  }

  shootSound.currentTime = 0;
  shootSound.play().catch(() => {});

  bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10
  });
});

// ================= ENEMY SHOOT =================
function enemyShoot() {

  if (enemies.length === 0) return;

  const shooter =
    enemies[Math.floor(Math.random() * enemies.length)];

  enemyBullets.push({
    x: shooter.x + shooter.width / 2,
    y: shooter.y + shooter.height,
    width: 6,
    height: 12,
    speed: 4
  });
}

// ================= SPAWN BOSS =================
function spawnBoss() {

  boss = {
    x: canvas.width / 2 - 65,
    y: 30,
    width: 130,
    height: 130,
    life: 20,
    direction: 1
  };

  bossAnimationFrame = 0;
  bossAnimationTimer = 0;
}

// ================= UPDATE =================
function update() {

  if (!gameStarted || gameOver) return;

  // ===== animació enemics =====
  animationTimer++;

  if (animationTimer > 30) {
    animationFrame =
      animationFrame === 0 ? 1 : 0;

    animationTimer = 0;
  }

  // ===== animació boss =====
  if (boss) {

    bossAnimationTimer++;

    if (bossAnimationTimer > 20) {

      bossAnimationFrame =
        bossAnimationFrame === 0 ? 1 : 0;

      bossAnimationTimer = 0;
    }
  }

  // ===== player =====
  if (keys["ArrowLeft"]) {
    player.x -= player.speed;
  }

  if (keys["ArrowRight"]) {
    player.x += player.speed;
  }

  if (player.x < 0) player.x = 0;

  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }

  // ===== bullets =====
  bullets.forEach(b => {
    b.y -= 7;
  });

  bullets = bullets.filter(b => b.y > 0);

  // ===== enemy bullets =====
  enemyBullets.forEach(b => {
    b.y += b.speed;
  });

  enemyBullets =
    enemyBullets.filter(b => b.y < canvas.height);

  // ===== enemies move =====
  let hitEdge = false;

  enemies.forEach(e => {

    e.x += enemyDirection * (1 + level * 0.2);

    if (e.x < 0 || e.x + e.width > canvas.width) {
      hitEdge = true;
    }
  });

  if (hitEdge) {

    enemyDirection *= -1;

    enemies.forEach(e => {
      e.y += 20;
    });
  }

  // ===== enemies reached bottom =====
  for (let e of enemies) {

    if (e.y + e.height >= canvas.height - 10) {
      gameOver = true;
      return;
    }
  }

  // ===== enemy shoot =====
  shootTimer++;

  if (shootTimer > Math.max(15, 60 - level * 5)) {

    enemyShoot();

    shootTimer = 0;
  }

  // ===== player hit =====
  for (let i = enemyBullets.length - 1; i >= 0; i--) {

    const b = enemyBullets[i];

    if (
      b.x < player.x + player.width &&
      b.x + b.width > player.x &&
      b.y < player.y + player.height &&
      b.y + b.height > player.y
    ) {

      enemyBullets.splice(i, 1);

      lives--;

      hitSound.currentTime = 0;
      hitSound.play().catch(() => {});

      if (lives <= 0) {
        gameOver = true;
      }
    }
  }

  // ===== bullets vs enemies =====
  for (let bi = bullets.length - 1; bi >= 0; bi--) {

    for (let ei = enemies.length - 1; ei >= 0; ei--) {

      const b = bullets[bi];
      const e = enemies[ei];

      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {

        bullets.splice(bi, 1);
        enemies.splice(ei, 1);

        explosionSound.currentTime = 0;
        explosionSound.play().catch(() => {});

        score += 10;

        if (score > highScore) {

          highScore = score;

          localStorage.setItem(
            "highScore",
            highScore
          );
        }

        break;
      }
    }
  }

  // ===== boss spawn =====
  if (!boss && score >= lastBossScore + 200) {

    spawnBoss();

    lastBossScore = score;
  }

  // ===== boss =====
  if (boss) {

    boss.x += boss.direction * 2;

    if (
      boss.x < 0 ||
      boss.x + boss.width > canvas.width
    ) {
      boss.direction *= -1;
    }

    // bullets vs boss
    for (let i = bullets.length - 1; i >= 0; i--) {

      const b = bullets[i];

      if (
        b.x < boss.x + boss.width &&
        b.x + b.width > boss.x &&
        b.y < boss.y + boss.height &&
        b.y + b.height > boss.y
      ) {

        bullets.splice(i, 1);

        boss.life--;

        if (boss.life <= 0) {

          score += 100;

          explosionSound.currentTime = 0;
          explosionSound.play().catch(() => {});

          boss = null;
        }

        break;
      }
    }
  }

  // ===== next level =====
  if (enemies.length === 0) {

    level++;

    createEnemies();
  }
}

// ================= DRAW =================
function draw() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ===== START SCREEN =====
  if (!gameStarted) {

    ctx.fillStyle = "white";

    ctx.font = "30px Arial";

    ctx.fillText(
      "INVADERS",
      canvas.width / 2 - 80,
      canvas.height / 2
    );

    ctx.font = "16px Arial";

    ctx.fillText(
      "Prem ENTER o el botó central",
      canvas.width / 2 - 120,
      canvas.height / 2 + 40
    );

    return;
  }

  // ===== enemy image =====
  const currentEnemyImg =
    animationFrame === 0
      ? enemyImg
      : enemyImg2;

  // ===== player =====
  ctx.fillStyle = "lime";

  ctx.fillRect(
    player.x,
    player.y,
    player.width,
    player.height
  );

  // ===== player bullets =====
  ctx.fillStyle = "white";

  bullets.forEach(b => {
    ctx.fillRect(
      b.x,
      b.y,
      b.width,
      b.height
    );
  });

  // ===== enemy bullets =====
  ctx.fillStyle = "orange";

  enemyBullets.forEach(b => {
    ctx.fillRect(
      b.x,
      b.y,
      b.width,
      b.height
    );
  });

  // ===== enemies =====
  enemies.forEach(e => {

    ctx.drawImage(
      currentEnemyImg,
      e.x,
      e.y,
      e.width,
      e.height
    );
  });

  // ===== boss =====
  if (boss) {

    const currentBossImg =
      bossAnimationFrame === 0
        ? bossImg
        : bossImg2;

    ctx.drawImage(
      currentBossImg,
      boss.x,
      boss.y,
      boss.width,
      boss.height
    );

    // life bar
    ctx.fillStyle = "red";

    ctx.fillRect(
      boss.x,
      boss.y - 10,
      boss.width,
      5
    );

    ctx.fillStyle = "lime";

    ctx.fillRect(
      boss.x,
      boss.y - 10,
      boss.width * (boss.life / 20),
      5
    );
  }

  // ===== UI =====
  ctx.fillStyle = "white";

  ctx.font = "16px Arial";

  ctx.fillText("Score: " + score, 10, 20);
  ctx.fillText("Record: " + highScore, 10, 40);
  ctx.fillText("Vides: " + lives, 10, 60);
  ctx.fillText("Nivell: " + level, 10, 80);

  // ===== GAME OVER =====
  if (gameOver) {

    ctx.font = "30px Arial";

    ctx.fillText(
      "GAME OVER",
      canvas.width / 2 - 90,
      canvas.height / 2
    );

    ctx.font = "16px Arial";

    ctx.fillText(
      "Prem ENTER o el botó central",
      canvas.width / 2 - 120,
      canvas.height / 2 + 40
    );
  }
}

// ================= RESET =================
function resetGame() {

  bullets = [];
  enemyBullets = [];
  enemies = [];
  boss = null;

  score = 0;
  lives = 3;
  level = 1;

  lastBossScore = 0;

  gameOver = false;

  player.x = canvas.width / 2 - 20;

  createEnemies();
}

// ================= LOOP =================
function gameLoop() {

  update();
  draw();

  requestAnimationFrame(gameLoop);
}

// ================= START =================
enemyImg.onload = () => {

  createEnemies();

  gameLoop();
};
