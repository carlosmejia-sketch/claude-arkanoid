# SPEC 01 — MVP jugable de Arkanoid

> **Estado:** Aprobado
> **Depende de:** — (ninguno; primer spec)
> **Fecha:** 2026-07-22
> **Objetivo:** Entregar un Arkanoid de un nivel jugable de principio a fin, con paleta, bola, bloques que se rompen, vidas, puntuación y pantallas de inicio/victoria/derrota.

---

## Alcance

**Dentro:**

- Lienzo `<canvas>` de resolución lógica fija (800×600), centrado en la página.
- Paleta controlable con **ratón** (sigue el cursor) y **teclado** (flechas ←/→).
- Una bola con rebote: ángulo de salida según el punto de impacto en la paleta; velocidad constante.
- Saque manual: la bola arranca pegada a la paleta y se lanza con **click** o **barra espaciadora**.
- Un nivel fijo (layout de bloques hardcodeado) con bloques de **un solo golpe**.
- Puntuación: cada bloque roto suma la misma cantidad (10 puntos); se muestra en pantalla.
- Vidas: empieza con **3**; perder la bola por abajo resta una vida.
- Pantallas de estado: **inicio** (pulsa para jugar), **Game Over** (0 vidas) y **Victoria** (todos los bloques rotos), ambas con opción de reiniciar.
- Assets: sprites de `assets/spritesheet.js` (paleta, bola, bloques por color), sonidos `ball-bounce.mp3` y `break-sound.mp3`, y animación de explosión (`EXPLOSION_FRAMES`) al romper un bloque.
- Bucle de juego con `requestAnimationFrame`.

**Fuera de alcance (para specs futuros):**

- Power-ups (agrandar/encoger paleta, multibola, etc.) → spec propio.
- Múltiples niveles y progresión entre ellos.
- Bloques multi-golpe o indestructibles.
- Persistencia de mejor puntuación (localStorage) u online.
- Aceleración de la bola / dificultad progresiva.
- Puntos diferenciados por color de bloque.
- Versión móvil / controles táctiles.
- Menú de opciones, ajustes de volumen, pausa.

---

## Modelo de datos

```js
// Estado global del juego
const game = {
  phase: "start",        // "start" | "playing" | "gameover" | "win"
  score: 0,              // puntos acumulados
  lives: 3,              // vidas restantes
  ballLaunched: false,   // false = pegada a la paleta esperando saque
};

// Paleta
const paddle = {
  x: 350, y: 560,        // esquina superior izquierda (px)
  w: 100, h: 20,         // tamaño (px)
  speed: 7,              // px/frame con teclado
};

// Bola
const ball = {
  x: 400, y: 540,        // centro (px)
  r: 8,                  // radio (px)
  vx: 0, vy: 0,          // velocidad (px/frame); módulo constante = SPEED
};

// Bloque individual
// { x, y, w, h, color, alive }
//   color: "gray"|"red"|"yellow"|"cyan"|"magenta"|"hotpink"|"green"
//   alive: true mientras no se ha roto
const bricks = [ /* array plano generado desde el layout */ ];

// Layout del nivel: filas de colores. Cada fila es un color de sprite.
const LEVEL = [
  ["red", "red", "red", "red", "red", "red", "red", "red"],
  ["yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow"],
  ["cyan", "cyan", "cyan", "cyan", "cyan", "cyan", "cyan", "cyan"],
  ["green", "green", "green", "green", "green", "green", "green", "green"],
];

// Explosiones activas al romper un bloque (animación temporal)
// { x, y, w, h, color, startedAt }  -> usa EXPLOSION_FRAMES[color] / EXPLOSION_DURATION
const explosions = [];
```

**Convenciones:**

- Origen de coordenadas: esquina superior izquierda del canvas.
- Velocidades en píxeles por frame.
- Constantes en mayúsculas (`SPEED`, `LEVEL`, `POINTS_PER_BRICK = 10`).
- La rejilla de bloques se genera a partir de `LEVEL`: nº columnas y filas define ancho/alto de cada bloque con márgenes fijos.

---

## Plan de implementación

1. **Esqueleto HTML/CSS.** Crear `index.html` con `<canvas id="game" width="800" height="600">`, enlazar `styles.css` (fondo oscuro, canvas centrado), `assets/spritesheet.js` y `game.js`. Prueba manual: abrir en navegador, se ve el canvas vacío sin errores en consola.

2. **Carga de assets y bucle vacío.** En `game.js`, llamar `loadSpritesheet(cb)` y arrancar un `requestAnimationFrame` que limpia el canvas cada frame. Prueba: consola sin errores, canvas en negro estable.

3. **Dibujar paleta y bola estáticas.** Definir `paddle` y `ball`; dibujarlos con `drawSprite`. Prueba: se ven paleta abajo y bola encima, quietas.

4. **Mover la paleta.** Listeners de ratón (sigue cursor, con clamp a los bordes) y teclado (←/→). Prueba: la paleta se mueve con ambos y no se sale del canvas.

5. **Generar y dibujar los bloques.** Construir `bricks` desde `LEVEL` y dibujarlos con `drawSprite('block_<color>', …)`. Prueba: se ve la rejilla de bloques arriba.

6. **Saque de la bola.** La bola sigue a la paleta mientras `ballLaunched` es `false`; con click o espacio se lanza (`vx/vy` con módulo `SPEED`). Prueba: la bola sale al pulsar.

7. **Rebotes con paredes y paleta.** Rebote en bordes izq/dcho/arriba; rebote en la paleta con ángulo según punto de impacto; reproducir `ball-bounce.mp3`. Prueba: la bola rebota de forma controlable.

8. **Colisión con bloques + puntuación.** Detectar impacto bola-bloque, marcar `alive=false`, invertir componente de velocidad, sumar `POINTS_PER_BRICK`, reproducir `break-sound.mp3`. Prueba: romper un bloque lo elimina y sube el marcador.

9. **Animación de explosión.** Al romper, empujar a `explosions` y dibujar `drawFrame` con `EXPLOSION_FRAMES[color]` durante `EXPLOSION_DURATION`. Prueba: al romper se ve la explosión y luego desaparece.

10. **Vidas y pérdida de bola.** Si la bola cae por debajo, restar vida y volver a saque pegado; a 0 vidas pasar a `gameover`. Prueba: perder la bola resta vida; a 0 termina.

11. **HUD (puntuación y vidas).** Dibujar puntuación y vidas restantes sobre el canvas. Prueba: HUD refleja el estado en tiempo real.

12. **Pantallas de estado.** `start` (texto "pulsa para jugar"), `win` (todos los bloques rotos) y `gameover`, cada una con reinicio (click/espacio) que resetea el estado. Prueba: se puede jugar una partida completa, ganar o perder y volver a empezar.

---

## Criterios de aceptación

- [ ] El juego carga en el navegador sin errores en consola.
- [ ] Al abrir se muestra la pantalla de inicio con el texto para empezar.
- [ ] La paleta sigue el cursor del ratón y no se sale del canvas.
- [ ] La paleta se mueve con las flechas ←/→ y no se sale del canvas.
- [ ] La bola empieza pegada a la paleta y se lanza con click o barra espaciadora.
- [ ] La bola rebota en las paredes izquierda, derecha y superior.
- [ ] El ángulo de rebote en la paleta cambia según dónde golpea la bola.
- [ ] La velocidad (módulo) de la bola se mantiene constante durante la partida.
- [ ] Al inicio se muestran los bloques del nivel según `LEVEL`.
- [ ] Romper un bloque lo elimina de la pantalla.
- [ ] Romper un bloque suma exactamente 10 puntos.
- [ ] Al romper un bloque se reproduce `break-sound.mp3`.
- [ ] Al rebotar en paleta o paredes se reproduce `ball-bounce.mp3`.
- [ ] Al romper un bloque aparece su animación de explosión y luego desaparece.
- [ ] El HUD muestra la puntuación y las vidas restantes actualizadas.
- [ ] Perder la bola por abajo resta una vida y la bola vuelve a estado de saque.
- [ ] Al llegar a 0 vidas se muestra la pantalla de Game Over.
- [ ] Al romper todos los bloques se muestra la pantalla de Victoria.
- [ ] Desde Game Over y Victoria se puede reiniciar y jugar de nuevo con el estado reseteado.

---

## Decisiones

- **Sí:** control combinado ratón + teclado. Máxima jugabilidad sin coste extra.
- **Sí:** un solo nivel fijo hardcodeado en `LEVEL`. Suficiente para un MVP jugable; más niveles en otro spec.
- **Sí:** bloques de un solo golpe. Simplifica la lógica de colisión y estado.
- **Sí:** ángulo de rebote según punto de impacto en la paleta, con velocidad constante. Es el control clásico de Arkanoid y evita que la bola se vuelva ingobernable.
- **Sí:** saque manual (bola pegada, se lanza con click/espacio). Da control al jugador al empezar cada vida.
- **Sí:** puntos iguales por bloque (10). Marcador simple y predecible.
- **Sí:** usar sprites, sonidos y explosiones ya disponibles. Los assets existen y dan acabado sin trabajo de arte.
- **Sí:** tres archivos (`index.html`, `game.js`, `styles.css`). Ordenado y sin dependencias.
- **Sí:** canvas de resolución lógica fija 800×600. Evita complejidad de escalado responsive en el MVP.
- **No:** power-ups. Multiplican el alcance (entidades que caen, temporizadores, estados de bola); van en su propio spec.
- **No:** persistencia de mejor puntuación. No es necesaria para probar que el juego es jugable; se añade después.
- **No:** aceleración de la bola / dificultad progresiva. Se decidió velocidad constante.
- **No:** puntos diferenciados por color. Se prefirió marcador simple.
- **No:** módulos JS separados por entidad. Un único `game.js` es suficiente para este tamaño.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Abrir con `file://` bloquea la carga del spritesheet/sonidos por CORS. | Servir la carpeta con un servidor HTTP estático (ya indicado en `CLAUDE.md`); documentarlo en el README. |
| Políticas de autoplay: el navegador bloquea el audio hasta la primera interacción. | El primer sonido ocurre tras el click/espacio de saque, que ya es una interacción del usuario. |
| Con velocidad alta la bola puede "atravesar" un bloque entre frames (tunneling). | Mantener `SPEED` moderado (menor que el grosor del bloque por frame) en el MVP; colisión continua queda fuera de alcance. |
| Rebote en la paleta puede dejar la bola casi horizontal y volverse tediosa. | Limitar el ángulo de salida a un rango (p. ej. ±60° respecto a la vertical). |

---

## Lo que **no** entra en este spec

- Power-ups.
- Múltiples niveles y progresión.
- Bloques multi-golpe o indestructibles.
- Persistencia de puntuaciones (localStorage u online).
- Aceleración de la bola / dificultad progresiva.
- Versión móvil / controles táctiles.
- Menú de opciones, pausa, ajustes de volumen.

Cada uno de ellos, si llega, va en su propio spec.
