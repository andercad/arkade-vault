# SPEC 02 — Partículas en la destrucción de bloques

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-09
> **Objective:** Mejorar la animación de destrucción de bloques añadiendo partículas del color del bloque que salen despedidas, caen y se desvanecen durante unos 400 ms, junto a la explosión de sprites ya existente.

---

## Why this spec exists

La SPEC 01 ya implementa la destrucción de bloques con la explosión de 4 frames (`EXPLOSION_FRAMES`, 150 ms). Es correcta pero corta y poco vistosa. Esta spec no sustituye esa animación: le añade una capa de partículas para dar más sensación de impacto.

---

## Scope

**In:**

- Al romper un bloque se generan `PARTICLE_COUNT` partículas en el centro del bloque, con el color de ese bloque.
- Cada partícula sale con velocidad y dirección aleatorias, cae por gravedad y se desvanece (alpha) hasta desaparecer a los `PARTICLE_LIFE` ms (400 ms).
- Las partículas se dibujan como cuadrados con `fillRect`, sin assets nuevos.
- La explosión de sprites existente se mantiene tal cual y se ve a la vez que las partículas.
- Las partículas se congelan en pausa y se vacían al reiniciar la partida.
- Todos los cambios van en `game.js`.

**Out of scope (for future specs):**

- Sacudida de pantalla (screen shake).
- Puntos flotantes (`+10`) en el sitio del bloque.
- Fade o escala de la explosión de sprites.
- Cambiar `EXPLOSION_DURATION` o cualquier cosa de `assets/spritesheet.js`.
- Sonido (`assets/sounds/break-sound.mp3` sigue sin usarse, igual que en la SPEC 01).
- Colisión de partículas con pala, paredes o bola.
- Partículas en otros eventos (rebote en pala, perder vida, victoria).

---

## Data model

```js
// Constantes nuevas (game.js)
const PARTICLE_COUNT = 8;       // partículas por bloque roto
const PARTICLE_SIZE = 4;        // lado del cuadrado en px
const PARTICLE_LIFE = 400;      // ms de vida
const PARTICLE_SPEED_MIN = 60;  // px/s
const PARTICLE_SPEED_MAX = 180; // px/s
const PARTICLE_GRAVITY = 900;   // px/s², hacia abajo
const PARTICLE_COLORS = {       // hex aproximado al color de cada fila de BRICK_COLORS
  red: '#e53935',
  yellow: '#fdd835',
  cyan: '#26c6da',
  magenta: '#ab47bc',
  hotpink: '#ff4081',
  green: '#43a047',
};

// Estado del juego: se añade una lista
game.particles = []; // { x, y, vx, vy, color, age } (age en ms, acumulado con dt)
```

Convenciones:

- Mismas que la SPEC 01: origen arriba a la izquierda, velocidades en px/s y movimiento escalado con delta time.
- `age` se acumula con `dt` (no con `performance.now()`), de modo que la pausa congela las partículas.
- Alpha de dibujo: `1 - age / PARTICLE_LIFE`.
- La partícula se elimina cuando `age >= PARTICLE_LIFE`.

---

## Implementation plan

1. Añadir las constantes de partículas y `game.particles = []`, y vaciar la lista donde ya se reinician `game.explosions`. Prueba manual: el juego funciona igual que antes, sin errores en consola.
2. Generar `PARTICLE_COUNT` partículas en el centro del bloque justo donde ya se crea la explosión al romperlo. Prueba manual: tras romper un bloque, `game.particles.length` en consola vale 8.
3. Actualizar las partículas en `update(dt)`: mover con `vx`/`vy`, aplicar gravedad, sumar `dt` a `age` y descartar las que superen `PARTICLE_LIFE`. No actualizar en pausa. Prueba manual: tras ~400 ms `game.particles.length` vuelve a 0; en pausa el valor y las posiciones no cambian.
4. Dibujar las partículas en `render()` con `fillRect` y alpha decreciente, entre las explosiones y la pala. Prueba manual: al romper un bloque salen cuadrados de su color que caen y se desvanecen junto a la explosión de sprites.

---

## Acceptance criteria

- [x] Romper un bloque genera exactamente 8 partículas del color de ese bloque.
- [x] Las partículas nacen en el centro del bloque roto.
- [x] Las partículas caen por gravedad y se desvanecen hasta desaparecer a los 400 ms.
- [x] Pasados 400 ms desde la rotura, `game.particles` no contiene partículas de ese bloque.
- [x] La explosión de sprites de 150 ms sigue viéndose a la vez que las partículas.
- [x] Pausar con `P` o `Esc` congela las partículas; al reanudar continúan desde donde estaban.
- [x] Tras game over o victoria y reinicio, `game.particles` está vacío.
- [x] Romper varios bloques seguidos no provoca errores en consola ni caída visible de fluidez.
- [x] No se ha modificado ningún archivo salvo `game.js`.
- [x] La puntuación, las colisiones y el resto del comportamiento de la SPEC 01 no cambian.

---

## Decisions

- **Sí:** partículas dibujadas con `fillRect`. No requiere assets nuevos ni tocar el spritesheet.
- **Sí:** mantener la explosión de sprites de 150 ms y añadir partículas encima. Es la mejora más visible con el menor cambio.
- **Sí:** duración total de ~400 ms. Se nota más que ahora sin estorbar el ritmo de juego.
- **Sí:** `age` acumulado con `dt`. Así la pausa congela las partículas sin lógica extra.
- **Sí:** constantes de partículas en `game.js`. Es el único fichero que cambia.
- **Sí:** valores iniciales de partículas (8, 4 px, 60–180 px/s, 900 px/s²) como punto de partida. Se pueden ajustar al probar sin cambiar el diseño.
- **No:** modificar `EXPLOSION_DURATION` ni `assets/spritesheet.js`. Es un asset ajeno a la lógica del juego.
- **No:** sacudida de pantalla ni puntos flotantes. Elegidos fuera de esta spec; cada uno iría en la suya.
- **No:** sonido. Se mantiene la decisión cerrada de la SPEC 01.
- **No:** colisión de partículas. Son puramente decorativas y no afectan a la jugabilidad.

---

## Risks

| Risk                                                         | Mitigation                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Muchas partículas a la vez si se rompen bloques muy seguidos | Máximo 8 por bloque y 400 ms de vida; el volumen es bajo. Se descartan al terminar su vida.          |
| `PARTICLE_COLORS` no coincide visualmente con los sprites    | Son valores aproximados y ajustables. Se revisan al probar.                                          |
| La explosión de sprites sigue usando `performance.now()`     | Fuera de alcance. Solo las partículas usan `dt`, así que en pausa pueden quedar desfasadas respecto a ella. |

---

## What is **not** in this spec

- Sacudida de pantalla.
- Puntos flotantes (`+10`).
- Cambios en la explosión de sprites o en `assets/spritesheet.js`.
- Sonido.
- Colisión de partículas.
- Partículas en eventos distintos de romper un bloque.

Cada uno de ellos, si se aborda, irá en su propia spec.
