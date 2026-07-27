# CLAUDE.md

Este archivo ofrece orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Qué es esto

Un juego de Arkanoid/Breakout jugable en **HTML, CSS y JavaScript puros — cero dependencias**. Sin bundler, framework ni gestor de paquetes. No añadas ninguno salvo que un spec lo pida explícitamente.

El idioma del proyecto es español (ver `README.md`). Responde en el mismo idioma que use la persona usuaria.

## Flujo de desarrollo: dirigido por specs

**Todo el trabajo de funcionalidades pasa por un spec antes de escribir cualquier código.** Dos skills lo dirigen:

- **`/spec <descripción>`** — diseña un spec sección por sección (primero hace preguntas de aclaración, nunca escribe código). Se guarda en `specs/NN-slug.md` en estado `Draft`.
- **`/spec-impl <NN-slug>`** — implementa un spec *aprobado*. Se niega a ejecutarse salvo que el estado del spec signifique "Aprobado". Crea/cambia a una rama de git `spec-NN-slug` (controlado por `AutoCreateBranch` en `specs/.spec-config.yml`, por defecto `true`), luego implementa paso a paso, pausando tras cada paso para revisar el diff.

Definiciones de las skills: `.agents/skills/spec/SKILL.md` y `.agents/skills/spec-impl/SKILL.md`. La estructura del spec está definida en `.agents/skills/spec/template.md` (fuente de verdad para la forma de las secciones). El código fuente/hashes completos se rastrean en `skills-lock.json`.

### Formato del spec

Cada `specs/NN-slug.md` abre con una cabecera en blockquote (`Status`, `Depends on`, `Date`, `Objective`), luego secciones: **Scope** (`In` / `Out of scope` — ambas obligatorias), **Data model**, **Implementation plan** (numerado, cada paso commitable y ejecutable por sí solo), **Acceptance criteria** (checklist booleano), **Decisions** (elegidas *y* descartadas, con razones), **Risks** opcional. Escrito en español para este repo.

**Valores de estado:** `Draft` → `In review` → `Approved` → `Implemented` → `Obsolete`. Los equivalentes en español (`Borrador`, `En revisión`, `Aprobado`, `Implementado`, `Obsoleto`) se aceptan y se usan aquí. `/spec-impl` solo se ejecuta sobre un spec Aprobado; márcalo como `Implementado` y marca los criterios de aceptación cuando esté hecho.

Specs existentes (ambos `Implementado`):
- `specs/01-mvp-jugable.md` — MVP jugable de un solo nivel (paleta, bola, bloques rompibles, vidas, puntuación, pantallas de inicio/victoria/gameover).
- `specs/02-niveles-velocidad-selector.md` — 5 niveles seleccionables mediante `<select>`, velocidad de la bola escalando con el número de nivel.

Para añadir una funcionalidad: ejecuta `/spec` para el siguiente `NN`, consigue que se apruebe, luego `/spec-impl`. No te saltes el spec.

## Arquitectura del juego

Todo el juego son tres archivos en la raíz del repo, cargados por `index.html`:

- `index.html` — `<canvas id="game" width="800" height="600">` (resolución lógica fija) más un `<select id="level">` (niveles 1–5); carga `assets/spritesheet.js` y luego `game.js`.
- `styles.css` — centra el canvas y el selector de nivel; tema oscuro.
- `game.js` — toda la lógica del juego. Un solo archivo, sin módulos. Estructura clave:
  - **Estado:** un objeto global `game` con `phase` (`"start" | "playing" | "gameover" | "win"`), `score`, `lives`, `ballLaunched`, `level`. Más `paddle`, `ball` y un array plano `bricks`.
  - **Niveles:** array `LEVELS` (5 entradas), cada una `{ speed, layout }`. `layout` son filas de 8 columnas; cada celda es un color de sprite o `null` (hueco). `speed = 3 + level` (4–8 px/frame). `buildBricks(layout)` aplana un layout en el array `bricks`.
  - **Bucle:** `requestAnimationFrame(loop)`, iniciado tras `loadSpritesheet`. `loop` limpia el canvas, actualiza paleta/bola/victoria solo mientras `phase === "playing"`, luego dibuja bloques, explosiones, paleta, bola, HUD y cualquier overlay.
  - **Entrada:** las flechas del teclado (objeto `keys`) y el ratón mueven la paleta; click / barra espaciadora activan `handleAction()`, que depende de la fase (start → empezar, playing → lanzar bola, gameover/win → reiniciar). La paleta solo se mueve durante `playing`.
  - **Colisión:** AABB bola-vs-bloque con eje de mínima penetración para la dirección del rebote; un bloque roto por frame. El ángulo de rebote de la paleta se deriva de la posición de impacto (`MAX_BOUNCE_ANGLE` = ±60°), manteniendo la magnitud de velocidad en `SPEED`.
  - **Coordenadas:** origen arriba a la izquierda; `ball.x/y` es el centro de la bola; velocidades en px/frame.

Al editar el gameplay, mantén intactos la estructura de un solo archivo sin build y la máquina de estados de las fases.

## Assets

- `assets/spritesheet-breakout.png` — la hoja de sprites. Se carga y dibuja vía `assets/spritesheet.js`.
- `assets/spritesheet.js` — la API de dibujo (no la edites salvo que un spec lo pida):
  - `loadSpritesheet(cb)` — carga async el PNG en un canvas fuera de pantalla, luego invoca `cb` (encola callbacks hasta que esté cargado). Llámala antes de dibujar.
  - `drawSprite(ctx, name, x, y, w, h)` — dibuja un sprite con nombre. Nombres: `paddle`, `ball`, o `block_<color>` (colores: `gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`).
  - `drawFrame(ctx, frame, x, y, w, h)` — dibuja un frame crudo `{sx,sy,sw,sh}`, p. ej. una entrada de `EXPLOSION_FRAMES[color]` (4 frames/color, `EXPLOSION_DURATION` = 150ms).
- `assets/sounds/` — `ball-bounce.mp3`, `break-sound.mp3`.

## Ejecución

Sin paso de build. Abre `index.html` en un navegador, o (preferido) sirve la carpeta sobre un servidor HTTP estático para que la hoja de sprites y los archivos de sonido se carguen sin las restricciones de `file://`.
