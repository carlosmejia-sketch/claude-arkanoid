// game.js — Arkanoid MVP

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 800
const HEIGHT = canvas.height; // 600

// --- Entidades ---

const SPEED = 5;                     // módulo constante de la velocidad de la bola (px/frame)
const MAX_BOUNCE_ANGLE = Math.PI / 3; // ±60° respecto a la vertical en el rebote de la paleta

// --- Sonidos ---

const sndBounce = new Audio("assets/sounds/ball-bounce.mp3");
const sndBreak = new Audio("assets/sounds/break-sound.mp3");

// Reinicia y reproduce un sonido (permite disparos rápidos y solapados).
function playSound(snd) {
  snd.currentTime = 0;
  snd.play().catch(() => {}); // ignora bloqueos de autoplay
}

// Estado global del juego
const game = {
  phase: "start",       // "start" | "playing" | "gameover" | "win"
  score: 0,
  lives: 3,
  ballLaunched: false,  // false = pegada a la paleta esperando saque
};

// Paleta (esquina superior izquierda)
const paddle = {
  x: 350, y: 560,
  w: 100, h: 20,
  speed: 7,
};

// Bola (x, y = centro)
const ball = {
  x: 400, y: 540,
  r: 8,
  vx: 0, vy: 0,
};

// --- Bloques ---

const POINTS_PER_BRICK = 10;

// Layout del nivel: cada fila es un color de sprite.
const LEVEL = [
  ["red", "red", "red", "red", "red", "red", "red", "red"],
  ["yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow"],
  ["cyan", "cyan", "cyan", "cyan", "cyan", "cyan", "cyan", "cyan"],
  ["green", "green", "green", "green", "green", "green", "green", "green"],
];

// Márgenes fijos de la rejilla (px)
const GRID_TOP = 60;      // separación desde el borde superior
const GRID_SIDE = 40;     // margen izquierdo/derecho
const BRICK_GAP = 4;      // hueco entre bloques
const BRICK_H = 24;       // alto de cada bloque

// Ancho de bloque derivado del nº de columnas y los márgenes.
const COLS = LEVEL[0].length;
const BRICK_W = (WIDTH - GRID_SIDE * 2 - BRICK_GAP * (COLS - 1)) / COLS;

// Genera el array plano de bloques a partir de LEVEL.
function buildBricks() {
  const list = [];
  for (let row = 0; row < LEVEL.length; row++) {
    for (let col = 0; col < LEVEL[row].length; col++) {
      list.push({
        x: GRID_SIDE + col * (BRICK_W + BRICK_GAP),
        y: GRID_TOP + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        color: LEVEL[row][col],
        alive: true,
      });
    }
  }
  return list;
}

let bricks = buildBricks();

// --- Entrada ---

const keys = { left: false, right: false };

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

// Saque con barra espaciadora.
document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    launchBall();
  }
});

// Saque con click.
canvas.addEventListener("mousedown", () => {
  launchBall();
});

// Lanza la bola si está pegada a la paleta (módulo de velocidad = SPEED).
function launchBall() {
  if (game.ballLaunched) return;
  game.ballLaunched = true;
  ball.vx = 0;
  ball.vy = -SPEED;
}

// La paleta sigue el cursor: centrada en el ratón, ajustando por el escalado del canvas.
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (WIDTH / rect.width);
  paddle.x = mouseX - paddle.w / 2;
  clampPaddle();
});

function clampPaddle() {
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.w > WIDTH) paddle.x = WIDTH - paddle.w;
}

// --- Actualización ---

function updatePaddle() {
  if (keys.left) paddle.x -= paddle.speed;
  if (keys.right) paddle.x += paddle.speed;
  clampPaddle();
}

function updateBall() {
  if (!game.ballLaunched) {
    // Pegada a la paleta: centrada encima de ella.
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r;
    return;
  }
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Rebote en paredes izquierda / derecha.
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = -ball.vx;
    playSound(sndBounce);
  } else if (ball.x + ball.r > WIDTH) {
    ball.x = WIDTH - ball.r;
    ball.vx = -ball.vx;
    playSound(sndBounce);
  }

  // Rebote en pared superior.
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = -ball.vy;
    playSound(sndBounce);
  }

  // Rebote en la paleta (sólo si la bola baja).
  if (
    ball.vy > 0 &&
    ball.y + ball.r >= paddle.y &&
    ball.y - ball.r <= paddle.y + paddle.h &&
    ball.x + ball.r >= paddle.x &&
    ball.x - ball.r <= paddle.x + paddle.w
  ) {
    bounceOffPaddle();
  }
}

// Ángulo de salida según el punto de impacto en la paleta; velocidad de módulo SPEED.
function bounceOffPaddle() {
  const paddleCenter = paddle.x + paddle.w / 2;
  let hit = (ball.x - paddleCenter) / (paddle.w / 2); // -1 (izq) .. +1 (dcha)
  hit = Math.max(-1, Math.min(1, hit));

  const angle = hit * MAX_BOUNCE_ANGLE; // respecto a la vertical
  ball.vx = SPEED * Math.sin(angle);
  ball.vy = -SPEED * Math.cos(angle);   // siempre hacia arriba

  ball.y = paddle.y - ball.r;           // reposiciona encima de la paleta
  playSound(sndBounce);
}

// --- Dibujo ---

function drawBricks() {
  for (const b of bricks) {
    if (!b.alive) continue;
    drawSprite(ctx, "block_" + b.color, b.x, b.y, b.w, b.h);
  }
}

function drawPaddle() {
  drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
}

function drawBall() {
  drawSprite(ctx, "ball", ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
}

// Bucle principal: limpia el canvas y dibuja la escena cada frame.
function loop() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  updatePaddle();
  updateBall();

  drawBricks();
  drawPaddle();
  drawBall();

  requestAnimationFrame(loop);
}

// Cargar el spritesheet y arrancar el bucle cuando esté listo.
loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
