# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Aprobado
> **Depends on:** Ninguna
> **Date:** 2026-11-09
> **Objective:** Crear un Arkanoid jugable en un único nivel fijo, con pala, bola, bloques, vidas, puntuación, pantalla de inicio, pausa y récord persistente.

---

## Scope

**In:**

- Página `index.html` en la raíz con un `<canvas>` fijo de 480x640 px, más `style.css` y `game.js` (scripts globales, sin módulos ES).
- Uso de `assets/spritesheet.js` para dibujar pala, bola, bloques y explosiones.
- Control de la pala con teclado (flechas izquierda/derecha y A/D) y con ratón (la pala sigue al cursor en X).
- Un único nivel fijo: 10 columnas x 6 filas de bloques, un color por fila.
- Bola con velocidad constante. Rebote en paredes, techo, pala y bloques.
- Rebote en pala con ángulo según el punto de impacto.
- Bola pegada a la pala al inicio y tras perder una vida. Se lanza con Espacio o clic.
- 3 vidas. Perder la bola por abajo resta una vida.
- Puntuación: 10 puntos por bloque.
- Estados: inicio, jugando, pausa, game over, victoria.
- Pantalla de inicio (título + instrucción) y pausa con `P` o `Esc`.
- Reinicio de partida tras game over o victoria con Espacio o clic.
- Animación de explosión al romper un bloque (`EXPLOSION_FRAMES`, `EXPLOSION_DURATION`).
- Récord (mejor puntuación) guardado en `localStorage`.
- HUD en el canvas: puntuación, récord y vidas.

**Out of scope (for future specs):**

- Varios niveles o generación aleatoria de niveles.
- Power-ups, bloques con varios golpes, bloques indestructibles.
- Aceleración de la bola durante la partida.
- Tabla de puntuaciones con varias entradas o nombres de jugador.
- Controles táctiles / versión móvil.
- Sonidos y efectos de audio (`assets/sounds/ball-bounce.mp3`, `break-sound.mp3`) y ajustes de volumen o silencio.
- Tests automáticos, linter o paso de build.

---

## Data model

```js
// Constantes
const CANVAS_W = 480;
const CANVAS_H = 640;
const BRICK_COLS = 10;
const BRICK_ROWS = 6;
const BRICK_W = 48;   // 480 / 10 (sprite 32x16 escalado x1.5)
const BRICK_H = 24;
const BRICK_TOP = 80; // margen superior para el HUD
const BRICK_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green']; // de arriba a abajo
const BRICK_POINTS = 10;
const PADDLE_W = 96;
const PADDLE_H = 14;
const PADDLE_SPEED = 420; // px/s (teclado)
const BALL_SIZE = 14;
const BALL_SPEED = 360;   // px/s, constante
const INITIAL_LIVES = 3;
const HIGHSCORE_KEY = 'arkanoid:v1:highScore';

// Estado del juego
const game = {
  state: 'start',  // 'start' | 'playing' | 'paused' | 'gameover' | 'won'
  score: 0,
  highScore: 0,    // leído de localStorage al cargar
  lives: INITIAL_LIVES,
  paddle: { x: 0, y: 600, w: PADDLE_W, h: PADDLE_H },
  ball: { x: 0, y: 0, vx: 0, vy: 0, size: BALL_SIZE, stuck: true },
  bricks: [],      // { x, y, w, h, color, alive }
  explosions: [],  // { x, y, w, h, color, start } (start en ms)
};
```

Convenciones:

- Origen de coordenadas arriba a la izquierda.
- Velocidades en px/s, movimiento escalado con delta time (`requestAnimationFrame`).
- `HIGHSCORE_KEY` guarda un entero como texto.
- Ángulo de rebote en pala: máximo 60° respecto a la vertical, 0° en el centro de la pala.

---

## Implementation plan

1. Crear `index.html` (canvas 480x640, carga `assets/spritesheet.js`, `style.css` y `game.js`), `style.css` (canvas centrado, fondo oscuro) y `game.js` con bucle `requestAnimationFrame`. Prueba manual: abrir `index.html` y ver el canvas con fondo, sin errores en consola.
2. Cargar el spritesheet con `loadSpritesheet` y dibujar pala y bola en posición fija. Prueba manual: se ven los sprites.
3. Mover la pala con teclado (flechas/A/D) y ratón, limitada a los bordes del canvas. Prueba manual: la pala se mueve y no sale del canvas.
4. Estado `start` con pantalla de título; Espacio o clic pasa a `playing`. Bola pegada a la pala que se lanza con Espacio o clic. Prueba manual: la bola sigue a la pala y sale al lanzar.
5. Movimiento de la bola con velocidad constante y rebote en paredes y techo. Prueba manual: la bola rebota en tres lados.
6. Rebote en la pala con ángulo según el punto de impacto. Prueba manual: impactar en el borde da más ángulo que en el centro.
7. Generar y dibujar la rejilla de bloques (10x6, un color por fila). Prueba manual: se ven 60 bloques.
8. Colisión bola-bloque: rompe el bloque, invierte la velocidad en el eje correcto y suma 10 puntos. Prueba manual: los bloques desaparecen y la puntuación sube.
9. Vidas y HUD: perder la bola resta una vida y recoloca la bola en la pala; 0 vidas → estado `gameover`. Victoria al romper todos los bloques (`won`). Reinicio con Espacio o clic. Prueba manual: recorrer ambos finales y reiniciar.
10. Pausa con `P` o `Esc` (solo desde `playing`, reanuda con la misma tecla). Prueba manual: el juego se congela y se reanuda sin saltos.
11. Animación de explosión al romper bloque con `EXPLOSION_FRAMES`. Prueba manual: se ve la animación de 150 ms en la posición del bloque.
12. Récord en `localStorage` (`arkanoid:v1:highScore`): leer al cargar, guardar al terminar la partida si se supera, mostrar en HUD. Prueba manual: recargar la página conserva el récord.

---

## Acceptance criteria

- [x] Abrir `index.html` con doble clic carga el juego sin errores en la consola.
- [x] El canvas mide 480x640 px y la pantalla de inicio muestra el título y la instrucción de empezar.
- [x] Espacio o clic en la pantalla de inicio comienza la partida con la bola pegada a la pala.
- [x] La pala se mueve con flechas, A/D y ratón, y no sale del canvas.
- [x] Espacio o clic lanza la bola; antes del lanzamiento la bola sigue a la pala.
- [x] La bola rebota en paredes laterales, techo, pala y bloques.
- [x] Golpear la pala en el borde produce un ángulo mayor que en el centro, con un máximo de 60° respecto a la vertical.
- [x] La velocidad de la bola es constante durante toda la partida.
- [x] Hay 60 bloques al inicio (10 columnas x 6 filas), con un color distinto por fila.
- [x] Romper un bloque suma exactamente 10 puntos y lo elimina del juego.
- [x] Romper un bloque reproduce la animación de explosión en su posición.
- [x] Empezar con 3 vidas; perder la bola por abajo resta una vida y vuelve a pegarla a la pala.
- [x] Con 0 vidas aparece la pantalla de game over con la puntuación final.
- [x] Al romper los 60 bloques aparece la pantalla de victoria.
- [x] Espacio o clic en game over o victoria reinicia la partida con 3 vidas, 0 puntos y 60 bloques.
- [x] `P` o `Esc` pausa el juego durante `playing`; pulsar de nuevo reanuda sin que la bola salte.
- [x] El HUD muestra puntuación, récord y vidas actuales.
- [x] El récord se guarda en `localStorage` bajo `arkanoid:v1:highScore` y se conserva al recargar la página.

---

## Decisions

- **Sí:** un único nivel fijo definido en código. Lo mínimo para un MVP jugable; más niveles van en otra spec.
- **Sí:** teclado y ratón. Cubre ambos estilos con poco coste.
- **Sí:** ángulo de rebote según punto de impacto y lanzamiento manual. Da control al jugador, que es lo que hace divertido al juego.
- **Sí:** velocidad de bola constante. Menos parámetros que ajustar; la aceleración queda para una spec futura.
- **Sí:** 3 vidas, puntuación de 10 por bloque y récord en `localStorage`. Cierra el bucle de juego con riesgo mínimo.
- **Sí:** archivos `index.html`, `style.css` y `game.js` con scripts globales. Funciona abriendo con doble clic (sin servidor) y respeta que `assets/spritesheet.js` no es módulo.
- **Sí:** vidas en el HUD como iconos de bola, no como número. Se entiende de un vistazo y reutiliza el sprite existente.
- **Sí:** clave `arkanoid:v1:highScore`. El prefijo de versión permite migrar el formato más adelante.
- **Sí:** canvas fijo 480x640 con bloques de 48x24 (sprite x1.5). Las 10 columnas ocupan exactamente el ancho.
- **No:** varios ficheros JS (`paddle.js`, `ball.js`…). Sobreingeniería para este tamaño.
- **No:** módulos ES. Obligarían a usar un servidor local por restricciones de `file://`.
- **No:** ningún tipo de sonido en el MVP (ni efectos ni música). Decisión cerrada del usuario; no se cargan ni se reproducen los archivos de `assets/sounds/`.
- **No:** canvas responsive. Complica colisiones y coordenadas sin aportar al MVP.

---

## Risks

| Risk                                                       | Mitigation                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `localStorage` deshabilitado o con error                   | Envolver lectura/escritura en `try/catch` y usar un valor en memoria. El juego sigue funcionando.   |
| Bola atraviesa bloques o pala a velocidad alta             | Limitar el delta time por frame (p. ej. máx. 1/30 s) y desplazar la bola en pasos pequeños si hace falta. |
| Rebote incorrecto en esquinas de bloques                   | Elegir el eje por menor solape de penetración; invertir solo ese eje.                               |
| Bola atrapada rebotando en horizontal                      | Garantizar un componente vertical mínimo de velocidad tras cada rebote.                             |
| Ratón y teclado activos a la vez                           | La última entrada recibida mueve la pala; no hay conflicto.                                         |

---

## What is **not** in this spec

- Varios niveles ni generador de niveles.
- Power-ups ni bloques especiales.
- Aceleración de la bola.
- Tabla de récords, nombres de jugador ni sincronización online.
- Controles táctiles / móvil.
- Sonidos y efectos de audio, ni ajustes de volumen o silencio.

Cada uno de ellos, si se aborda, irá en su propia spec.
