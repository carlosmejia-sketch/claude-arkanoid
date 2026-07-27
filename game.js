// game.js — Arkanoid MVP

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 800
const HEIGHT = canvas.height; // 600

// Bucle principal: limpia el canvas cada frame.
function loop() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  requestAnimationFrame(loop);
}

// Cargar el spritesheet y arrancar el bucle cuando esté listo.
loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
