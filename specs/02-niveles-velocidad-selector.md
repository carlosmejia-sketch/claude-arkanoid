# SPEC 02 — Niveles con velocidad progresiva y selector

> **Estado:** Aprobado
> **Depende de:** [01-mvp-jugable](01-mvp-jugable.md)
> **Fecha:** 2026-07-27
> **Objetivo:** Añadir 5 niveles seleccionables desde un `<select>` HTML, donde cada nivel tiene su propio layout de bloques y una velocidad de bola mayor a mayor número de nivel.

---

## Alcance

**Dentro:**

- Constante de datos `LEVELS`: array de 5 niveles, cada uno con su `layout` (rejilla de colores) y su velocidad de bola derivada del número de nivel (`speed = 3 + nivel` → 4, 5, 6, 7, 8 px/frame).
- Selector de nivel: un `<select>` HTML (opciones 1–5) colocado sobre el canvas, con **Nivel 1** por defecto.
- El `<select>` está **siempre visible**; se **deshabilita** mientras `phase === "playing"` y se rehabilita en `start` / `gameover` / `win`.
- Al iniciar una partida se usa el nivel elegido en el `<select>`: se construye su layout y `SPEED` pasa a ser la velocidad de ese nivel.
- HUD muestra el **nivel actual** (`Nivel N`) junto a puntos y vidas.
- Ganar (todos los bloques rotos) o perder (0 vidas) **vuelve al selector** (pantalla de inicio/estado con el `<select>` habilitado); el jugador puede cambiar de nivel antes de volver a jugar.
- 5 layouts hardcodeados, de **variedad visual** pero dificultad de disposición similar (la dificultad la marca la velocidad), usando los sprites de color existentes.
- Bloques de **un solo golpe** en los 5 niveles (sin cambios en la lógica de colisión/rotura).

**Fuera de alcance (para specs futuros):**

- Auto-avance entre niveles al ganar (el jugador siempre reelige en el selector).
- Bloques multi-golpe o indestructibles.
- Dificultad por layout creciente (nº de bloques/densidad escalando con el nivel).
- Persistencia del último nivel elegido entre sesiones (localStorage).
- Aceleración de la bola *dentro* de una misma partida (la velocidad es constante durante el nivel).
- Power-ups, puntos diferenciados por color, controles táctiles, pausa/menú de opciones.

---

## Modelo de datos

El nivel es un objeto con su velocidad y su layout. Se sustituye la constante `LEVEL` (una sola rejilla) por `LEVELS` (array de 5). Las celdas admiten `null` = sin bloque, para poder formar patrones.

```js
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
```

**Cambios en estado y constantes:**

```js
// Nuevo campo en el estado global: nivel activo (1..5).
const game = {
  phase: "start",
  score: 0,
  lives: 3,
  ballLaunched: false,
  level: 1,            // NUEVO — nivel en curso
};

// SPEED deja de ser constante fija: pasa a variable, fijada al empezar cada partida.
let SPEED = LEVELS[0].speed;   // antes: const SPEED = 5;

// COLS sigue siendo 8 (todas las rejillas tienen 8 columnas) → BRICK_W no cambia.
const COLS = 8;
```

**Convenciones:**

- `buildBricks(layout)` recibe el layout del nivel y **omite las celdas `null`** (no crea bloque).
- El nº de filas varía por nivel (4 o 5); `GRID_TOP`, `GRID_SIDE`, `BRICK_GAP`, `BRICK_H` y `BRICK_W` no cambian.
- El `<select>` guarda el nº de nivel como string `"1".."5"`; se convierte a entero al empezar la partida y se asigna a `game.level`.

Nota: los 5 layouts son de **variedad visual** con recuento de bloques parecido (32 / 16 / 20 / 20 / 22), de modo que la dificultad la marca la velocidad, no el layout.

---

## Plan de implementación

1. **`<select>` en el HTML.** En `index.html`, añadir sobre el canvas un contenedor con `<label>` + `<select id="level">` con `<option value="1">Nivel 1</option>` … hasta 5. Prueba: se ve el desplegable sobre el canvas, con 5 opciones y "Nivel 1" por defecto; consola sin errores.

2. **Estilar el selector.** En `styles.css`, maquetar el contenedor (canvas + selector centrados en columna) y dar estilo al `<select>` acorde al fondo oscuro. Prueba: el selector queda alineado y legible encima del canvas.

3. **Sustituir `LEVEL` por `LEVELS`.** En `game.js`, reemplazar la constante `LEVEL` por el array `LEVELS` (5 objetos `{speed, layout}`). Convertir `SPEED` de `const` a `let` y `COLS` a `8` fijo. Prueba: consola sin errores (aún se juega el layout del nivel 1 por defecto).

4. **`buildBricks(layout)` con huecos.** Cambiar `buildBricks` para recibir un `layout` y **saltar celdas `null`**. Añadir `game.level` al estado. Prueba: al forzar cada layout se dibujan las rejillas correctas y los huecos quedan vacíos.

5. **Leer el nivel al empezar la partida.** En `handleAction` (transición `start → playing`) y en `resetGame`, leer `document.getElementById("level").value`, fijar `game.level`, `SPEED = LEVELS[level-1].speed` y `bricks = buildBricks(LEVELS[level-1].layout)`. Prueba: elegir un nivel y empezar carga su layout y su velocidad.

6. **Habilitar/deshabilitar el `<select>`.** Deshabilitarlo al pasar a `playing` y rehabilitarlo en `start`/`gameover`/`win`. Prueba: durante el juego el selector no se puede cambiar; al terminar (ganar/perder) vuelve a estar activo.

7. **Nivel en el HUD.** En `drawHUD`, dibujar `Nivel N` (usando `game.level`) junto a puntos y vidas. Prueba: el HUD muestra el nivel en curso y coincide con el elegido.

8. **Verificar velocidad por nivel.** Comprobar que la bola se mueve más rápido a mayor nivel (`launchBall` y `bounceOffPaddle` ya usan `SPEED`, ahora variable). Prueba: nivel 1 lento y nivel 5 claramente más rápido; el módulo se mantiene constante durante la partida.

9. **Ciclo completo por nivel.** Jugar cada uno de los 5 niveles de principio a fin: ganar vuelve al selector, perder vuelve al selector, y se puede cambiar de nivel antes de rejugar. Prueba: partida completa reproducible en los 5 niveles con reinicio correcto.

Cada paso deja el juego ejecutable.

---

## Criterios de aceptación

- [ ] Sobre el canvas se muestra un `<select>` con 5 opciones (Nivel 1 a Nivel 5) y "Nivel 1" seleccionado por defecto.
- [ ] Al empezar la partida se carga el layout del nivel elegido en el `<select>`.
- [ ] La velocidad de la bola es mayor cuanto mayor es el nivel (4, 5, 6, 7, 8 px/frame para niveles 1–5).
- [ ] El módulo de la velocidad de la bola se mantiene constante durante toda una partida.
- [ ] Cada nivel muestra su propio layout de bloques y las celdas `null` quedan sin bloque.
- [ ] Todos los bloques se rompen de un solo golpe en los 5 niveles.
- [ ] El `<select>` está deshabilitado mientras se está jugando (`phase === "playing"`).
- [ ] El `<select>` vuelve a estar habilitado en las pantallas de inicio, Game Over y Victoria.
- [ ] El HUD muestra el nivel en curso (`Nivel N`) y coincide con el nivel elegido.
- [ ] Al ganar (todos los bloques rotos) el juego vuelve al selector y permite elegir nivel antes de rejugar.
- [ ] Al perder (0 vidas) el juego vuelve al selector y permite elegir nivel antes de rejugar.
- [ ] Cambiar de nivel en el `<select>` y volver a empezar carga el nuevo layout y la nueva velocidad.
- [ ] El juego carga sin errores en consola.

---

## Decisiones

- **Sí:** selector `<select>` HTML nativo sobre el canvas. Accesible, cero código de dibujo/input en canvas.
- **Sí:** 5 niveles con velocidad `= 3 + nivel` (4→8). Progresión lineal suave y predecible; el nivel 1 arranca algo más lento que el MVP (5) y el 5 sube a 8.
- **Sí:** cada nivel con su propio layout (velocidad + layout). El jugador percibe variedad visual además del cambio de ritmo.
- **Sí:** layouts de **variedad visual** con recuento de bloques parecido. La dificultad la marca la velocidad, no la densidad; evita rediseñar el balance por layout.
- **Sí:** celdas `null` en el layout para formar patrones (ajedrez, pirámide, franjas, marco). Reutiliza `buildBricks` con un simple salto de celda vacía.
- **Sí:** bloques de un solo golpe en los 5 niveles. Mantiene intacta la lógica de colisión del MVP.
- **Sí:** ganar o perder **vuelve al selector**. Coincide con "el usuario selecciona el nivel"; sin máquina de estados de progresión.
- **Sí:** `<select>` deshabilitado durante la partida y rehabilitado al terminar. Evita cambiar de nivel a mitad de juego sin ocultar el control.
- **Sí:** `SPEED` pasa de `const` a `let`, fijada al empezar cada partida. Cambio mínimo; el resto del código ya usa `SPEED`.
- **Sí:** `COLS` fijo a 8 en las 5 rejillas. Mantiene `BRICK_W` constante y bloques alineados entre niveles.
- **No:** auto-avance al ganar. Se prefirió reelección manual; el auto-avance iría en su propio spec.
- **No:** dificultad de layout creciente (más bloques a mayor nivel). Se decidió que la velocidad sea el único eje de dificultad.
- **No:** bloques multi-golpe/indestructibles. Fuera de alcance; mantiene la lógica simple.
- **No:** persistir el último nivel elegido (localStorage). No aporta al objetivo; se puede añadir después.
- **No:** aceleración de la bola dentro de una misma partida. La velocidad es constante por nivel.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| A velocidad 8 (nivel 5) la bola puede "atravesar" un bloque entre frames (tunneling), ya que `BRICK_H = 24` y el desplazamiento por frame crece. | 8 px/frame sigue siendo < 24 px (grosor de bloque), así que un frame no salta un bloque completo; si en pruebas se observa tunneling, bajar la velocidad del nivel 5 o el paso máximo. Colisión continua queda fuera de alcance. |
| El `<select>` HTML puede capturar el foco del teclado y "robar" las flechas ←/→ o la barra espaciadora del juego. | Tras elegir nivel y empezar, quitar el foco del `<select>` (`blur()`) al pasar a `playing`; además ya se deshabilita durante el juego. |
| Un layout con `null` mal formado (fila más corta/larga de 8) desalinearía la rejilla. | Las 5 rejillas son literales de 8 columnas revisadas en el spec; `buildBricks` recorre por índice de columna y omite `null`. |
| El nivel 1 (velocidad 4) es más lento que el MVP actual (5) y puede sentirse "flojo". | Es una decisión consciente (progresión 4→8). Si molesta, se recalibra la fórmula sin cambiar la estructura. |
