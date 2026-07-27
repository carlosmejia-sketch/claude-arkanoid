// game.js — Arkanoid MVP

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 800
const HEIGHT = canvas.height; // 600

// --- Entidades ---

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

// --- Dibujo ---

function drawPaddle() {
  drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
}

function drawBall() {
  drawSprite(ctx, "ball", ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
}

// Bucle principal: limpia el canvas y dibuja la escena cada frame.
function loop() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawPaddle();
  drawBall();

  requestAnimationFrame(loop);
}

// Cargar el spritesheet y arrancar el bucle cuando esté listo.
loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
