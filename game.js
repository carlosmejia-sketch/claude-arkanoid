// game.js — Arkanoid MVP

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const levelSelect = document.getElementById("level");

const WIDTH = canvas.width;   // 800
const HEIGHT = canvas.height; // 600

// --- Entidades ---

// Módulo de la velocidad de la bola (px/frame). Variable: se fija al empezar
// cada partida según el nivel elegido (speed = 3 + nivel).
let SPEED = 5;
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
  level: 1,             // nivel en curso (1..5)
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

// Los 5 niveles. speed = 3 + nº de nivel (4,5,6,7,8 px/frame).
// layout: filas de 8 columnas; cada celda es un color de sprite o null (hueco).
const LEVELS = [
  // Nivel 1 — filas llenas (clásico)
  {
    speed: 4,
    layout: [
      ["red",    "red",    "red",    "red",    "red",    "red",    "red",    "red"],
      ["yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow"],
      ["cyan",   "cyan",   "cyan",   "cyan",   "cyan",   "cyan",   "cyan",   "cyan"],
      ["green",  "green",  "green",  "green",  "green",  "green",  "green",  "green"],
    ],
  },
  // Nivel 2 — tablero de ajedrez (colores alternos, huecos alternos)
  {
    speed: 5,
    layout: [
      ["magenta", null, "magenta", null, "magenta", null, "magenta", null],
      [null, "cyan", null, "cyan", null, "cyan", null, "cyan"],
      ["magenta", null, "magenta", null, "magenta", null, "magenta", null],
      [null, "cyan", null, "cyan", null, "cyan", null, "cyan"],
    ],
  },
  // Nivel 3 — pirámide centrada
  {
    speed: 6,
    layout: [
      [null,     null,     null,   "red",    "red",   null,     null,     null],
      [null,     null,   "yellow", "yellow", "yellow","yellow", null,     null],
      [null,   "hotpink","hotpink","hotpink","hotpink","hotpink","hotpink", null],
      ["green", "green", "green", "green", "green", "green", "green", "green"],
    ],
  },
  // Nivel 4 — franjas verticales (columnas alternas)
  {
    speed: 7,
    layout: [
      ["red", null, "cyan", null, "yellow", null, "hotpink", null],
      ["red", null, "cyan", null, "yellow", null, "hotpink", null],
      ["red", null, "cyan", null, "yellow", null, "hotpink", null],
      ["red", null, "cyan", null, "yellow", null, "hotpink", null],
      ["red", null, "cyan", null, "yellow", null, "hotpink", null],
    ],
  },
  // Nivel 5 — marco hueco (borde de bloques, centro vacío)
  {
    speed: 8,
    layout: [
      ["gray", "gray",   "gray",   "gray",   "gray",   "gray",   "gray",   "gray"],
      ["gray",  null,     null,     null,     null,     null,     null,    "gray"],
      ["gray",  null,   "red",    "red",    "red",    "red",     null,    "gray"],
      ["gray",  null,     null,     null,     null,     null,     null,    "gray"],
      ["gray", "gray",   "gray",   "gray",   "gray",   "gray",   "gray",   "gray"],
    ],
  },
];

// Márgenes fijos de la rejilla (px)
const GRID_TOP = 60;      // separación desde el borde superior
const GRID_SIDE = 40;     // margen izquierdo/derecho
const BRICK_GAP = 4;      // hueco entre bloques
const BRICK_H = 24;       // alto de cada bloque

// Ancho de bloque derivado del nº de columnas y los márgenes.
// Todas las rejillas tienen 8 columnas → BRICK_W constante entre niveles.
const COLS = 8;
const BRICK_W = (WIDTH - GRID_SIDE * 2 - BRICK_GAP * (COLS - 1)) / COLS;

// Genera el array plano de bloques a partir de un layout de nivel.
function buildBricks(layout) {
  const list = [];
  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      const color = layout[row][col];
      if (color === null) continue; // celda vacía: sin bloque
      list.push({
        x: GRID_SIDE + col * (BRICK_W + BRICK_GAP),
        y: GRID_TOP + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        color: color,
        alive: true,
      });
    }
  }
  return list;
}

let bricks = buildBricks(LEVELS[game.level - 1].layout);

// Explosiones activas (animación temporal al romper un bloque).
// { x, y, w, h, color, startedAt }
const explosions = [];

// Marca de tiempo del frame actual (ms), fijada por requestAnimationFrame.
let now = 0;

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

// Acción principal (barra espaciadora).
document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    handleAction();
  }
});

// Acción principal (click).
canvas.addEventListener("mousedown", () => {
  handleAction();
});

// Lee el nivel elegido en el <select> y fija nivel, velocidad y bloques.
function applySelectedLevel() {
  const value = parseInt(levelSelect.value, 10);
  game.level = value;
  SPEED = LEVELS[value - 1].speed;
  bricks = buildBricks(LEVELS[value - 1].layout);
}

// Interpreta la acción (click/espacio) según la fase del juego.
function handleAction() {
  if (game.phase === "start") {
    applySelectedLevel();
    game.phase = "playing";
  } else if (game.phase === "playing") {
    launchBall();
  } else if (game.phase === "gameover" || game.phase === "win") {
    resetGame();
  }
}

// Lanza la bola si está pegada a la paleta (módulo de velocidad = SPEED).
function launchBall() {
  if (game.ballLaunched) return;
  game.ballLaunched = true;
  ball.vx = 0;
  ball.vy = -SPEED;
}

// Reinicia el estado completo y deja una partida lista para jugar.
function resetGame() {
  game.score = 0;
  game.lives = 3;
  game.ballLaunched = false;
  applySelectedLevel();
  game.phase = "playing";
  ball.vx = 0;
  ball.vy = 0;
  paddle.x = 350;
  explosions.length = 0;
}

// Victoria cuando no queda ningún bloque vivo.
function checkWin() {
  if (bricks.every((b) => !b.alive)) {
    game.phase = "win";
  }
}

// La paleta sigue el cursor: centrada en el ratón, ajustando por el escalado del canvas.
// Solo durante la partida; en start/gameover/win el ratón no mueve la barra (igual que el teclado).
canvas.addEventListener("mousemove", (e) => {
  if (game.phase !== "playing") return;
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

  // Bola perdida por abajo.
  if (ball.y - ball.r > HEIGHT) {
    loseLife();
    return;
  }

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

  collideBricks();

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

// Pierde una vida: vuelve al saque pegado o pasa a Game Over si no quedan vidas.
function loseLife() {
  game.lives--;
  game.ballLaunched = false;
  ball.vx = 0;
  ball.vy = 0;
  if (game.lives <= 0) {
    game.lives = 0;
    game.phase = "gameover";
  }
}

// Colisión bola-bloque: rompe el primer bloque golpeado en el frame.
function collideBricks() {
  for (const b of bricks) {
    if (!b.alive) continue;

    // AABB bola (bounding box) vs bloque.
    if (
      ball.x + ball.r < b.x ||
      ball.x - ball.r > b.x + b.w ||
      ball.y + ball.r < b.y ||
      ball.y - ball.r > b.y + b.h
    ) {
      continue;
    }

    // Eje de rebote: el de menor penetración.
    const overlapLeft = ball.x + ball.r - b.x;
    const overlapRight = b.x + b.w - (ball.x - ball.r);
    const overlapTop = ball.y + ball.r - b.y;
    const overlapBottom = b.y + b.h - (ball.y - ball.r);
    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop, overlapBottom);

    if (minX < minY) {
      ball.vx = -ball.vx;
    } else {
      ball.vy = -ball.vy;
    }

    b.alive = false;
    game.score += POINTS_PER_BRICK;
    explosions.push({ x: b.x, y: b.y, w: b.w, h: b.h, color: b.color, startedAt: now });
    playSound(sndBreak);
    break; // un solo bloque por frame
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

// Elimina explosiones cuyo tiempo de vida ha terminado.
function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    if (now - explosions[i].startedAt >= EXPLOSION_DURATION) {
      explosions.splice(i, 1);
    }
  }
}

function drawExplosions() {
  const frameCount = 4; // 4 frames por color
  const frameMs = EXPLOSION_DURATION / frameCount;
  for (const ex of explosions) {
    const elapsed = now - ex.startedAt;
    let idx = Math.floor(elapsed / frameMs);
    if (idx >= frameCount) idx = frameCount - 1;
    const frame = EXPLOSION_FRAMES[ex.color][idx];
    drawFrame(ctx, frame, ex.x, ex.y, ex.w, ex.h);
  }
}

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

const LIFE_ICON = 20;  // tamaño del sprite de vida (px)
const LIFE_GAP = 6;    // separación entre iconos (px)

function drawHUD() {
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("Puntos: " + game.score, 12, 12);

  // Nivel en curso, centrado en la parte superior.
  ctx.textAlign = "center";
  ctx.fillText("Nivel " + game.level, WIDTH / 2, 12);
  ctx.textAlign = "left";

  // Vidas: un sprite de la bola por cada vida restante, alineadas a la derecha.
  for (let i = 0; i < game.lives; i++) {
    const x = WIDTH - 12 - (i + 1) * LIFE_ICON - i * LIFE_GAP;
    drawSprite(ctx, "ball", x, 12, LIFE_ICON, LIFE_ICON);
  }
}

// Superposición con título y subtítulo centrados sobre un velo oscuro.
function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "48px Arial, sans-serif";
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 30);

  ctx.font = "22px Arial, sans-serif";
  ctx.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 30);
}

function drawStartScreen() {
  drawOverlay("ARKANOID", "Pulsa click o espacio para jugar");
}

function drawGameOverScreen() {
  drawOverlay("GAME OVER", "Pulsa click o espacio para reiniciar");
}

function drawWinScreen() {
  drawOverlay("¡VICTORIA!", "Pulsa click o espacio para jugar de nuevo");
}

// Bucle principal: limpia el canvas y dibuja la escena cada frame.
function loop(timestamp) {
  now = timestamp;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // El selector solo es usable fuera de la partida (start/gameover/win).
  // Deshabilitarlo mientras se juega también le quita el foco del teclado.
  levelSelect.disabled = game.phase === "playing";

  if (game.phase === "playing") {
    updatePaddle();
    updateBall();
    checkWin();
  }
  updateExplosions();

  drawBricks();
  drawExplosions();
  drawPaddle();
  drawBall();
  drawHUD();

  if (game.phase === "start") drawStartScreen();
  else if (game.phase === "gameover") drawGameOverScreen();
  else if (game.phase === "win") drawWinScreen();

  requestAnimationFrame(loop);
}

// Cargar el spritesheet y arrancar el bucle cuando esté listo.
loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
