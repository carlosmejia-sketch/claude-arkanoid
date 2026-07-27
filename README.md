# Juego de Arkanoid

Un juego de Arkanoid/Breakout jugable hecho con **HTML, CSS y JavaScript puros — cero dependencias**. Sin bundler, framework ni gestor de paquetes.

## Cómo jugar

1. Elige un nivel (1–5) en el selector sobre el tablero.
2. Pulsa **click** o **barra espaciadora** para empezar y para lanzar la bola.
3. Mueve la paleta con las **flechas ←/→** o con el **ratón**.
4. Rompe todos los bloques para ganar. Pierdes una vida cada vez que la bola cae por abajo; con 0 vidas es Game Over.

Empiezas con **3 vidas** y cada bloque roto suma **10 puntos**. A mayor número de nivel, mayor velocidad de la bola.

## Cómo ejecutar

Sin paso de build. Abre `index.html` en un navegador, o (preferido) sirve la carpeta sobre un servidor HTTP estático para que la hoja de sprites y los sonidos se carguen sin las restricciones de `file://`. Por ejemplo:

```bash
python -m http.server
```

Luego abre `http://localhost:8000` en el navegador.

## Estructura

- `index.html` — página con el `<canvas>` (800×600) y el selector de nivel.
- `styles.css` — estilos y centrado; tema oscuro.
- `game.js` — toda la lógica del juego (estado, niveles, bucle, colisiones, entrada).
- `assets/` — hoja de sprites (`spritesheet-breakout.png`), su API de dibujo (`spritesheet.js`) y sonidos (`assets/sounds/`).
- `specs/` — especificaciones de las funcionalidades (desarrollo dirigido por specs).

## Desarrollo

El proyecto sigue un flujo **dirigido por specs**: toda funcionalidad se diseña primero en un spec (`specs/NN-slug.md`) y solo después se implementa. Ver `CLAUDE.md` para el detalle del flujo y la arquitectura.
