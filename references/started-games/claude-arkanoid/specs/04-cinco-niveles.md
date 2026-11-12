# SPEC 04 — Cinco niveles con patrones y velocidad creciente

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-09
> **Objective:** Convertir el juego en cinco niveles consecutivos, cada uno con un patrón de bloques distinto y una velocidad de bola un 8 % mayor que el anterior.

---

## Why this spec exists

La SPEC 01 dejó fuera varios niveles y la aceleración de la bola. Esta spec **levanta esas dos exclusiones**: la velocidad ya no es constante en toda la partida, sino constante dentro de cada nivel.

---

## Scope

**In:**

- Cinco niveles definidos en código (`LEVELS`), cada uno con un patrón de bloques distinto sobre la rejilla de 10 columnas x 6 filas.
- Velocidad de bola por nivel: `BALL_SPEED * (1 + 0.08 * (nivel - 1))`, constante durante el nivel.
- Todos los bloques siguen siendo de un golpe y valen 10 puntos. El color sigue siendo uno por fila (`BRICK_COLORS`).
- Al romper todos los bloques de un nivel que no es el quinto, se muestra una pantalla intermedia «NIVEL N COMPLETADO» y Espacio o clic empieza el siguiente.
- Al empezar un nivel, la bola queda pegada a la pala y la pala se centra.
- Las vidas y la puntuación se mantienen entre niveles.
- Al completar el nivel 5 se muestra la pantalla de victoria actual (`won`).
- Game over o victoria y reinicio vuelven al nivel 1 con 3 vidas y 0 puntos.
- El HUD muestra «NIVEL N» sin romper el layout actual.
- Selector de nivel en la pantalla de pausa: con el juego en `paused`, las teclas `1`–`5` (o clic en el botón del nivel) saltan a ese nivel con `startLevel(n)`. Se muestra la lista «1 2 3 4 5» con el nivel actual resaltado. Vidas y puntuación se mantienen; la bola queda pegada y el juego sale de la pausa a `start` del nivel elegido.
- Los patrones (`LEVELS`) viven en un archivo independiente `levels.js`, cargado desde `index.html` antes de `game.js`. El resto de cambios van en `game.js`.

**Out of scope (for future specs):**

- Bloques de varios golpes, indestructibles o con color/puntos distintos por nivel.
- Más de cinco niveles, bucle infinito tras el nivel 5 o generación aleatoria.
- Rótulo «NIVEL N» al empezar cada nivel (solo HUD y pantalla intermedia).
- Reponer vidas al pasar de nivel.
- Guardado de progreso o récord por nivel.
- Selector de nivel fuera de la pausa (menú inicial, pantalla de game over).
- Power-ups.
- Sonido en el cambio de nivel.
- Cambiar ángulos de rebote, tamaño de pala o de bola por nivel.

---

## Data model

```js
// Constantes nuevas (game.js)
const LEVEL_COUNT = 5;
const LEVEL_SPEED_STEP = 0.08; // +8 % de BALL_SPEED por nivel

// levels.js (script global, sin módulos; se carga antes que game.js)
// Un patrón por nivel: 6 filas x 10 columnas. 'X' = bloque, '.' = hueco.
// El color de cada bloque lo da su fila (BRICK_COLORS[fila]).
const LEVELS = [
  // 1. Rejilla completa (60 bloques)
  [
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
  ],
  // 2. Pirámide (40 bloques)
  [
    '....XX....',
    '...XXXX...',
    '..XXXXXX..',
    '.XXXXXXXX.',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
  ],
  // 3. Damero (30 bloques)
  [
    'X.X.X.X.X.',
    '.X.X.X.X.X',
    'X.X.X.X.X.',
    '.X.X.X.X.X',
    'X.X.X.X.X.',
    '.X.X.X.X.X',
  ],
  // 4. Columnas alternas (30 bloques)
  [
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
  ],
  // 5. Diamante (24 bloques)
  [
    '....XX....',
    '...XXXX...',
    '..XXXXXX..',
    '..XXXXXX..',
    '...XXXX...',
    '....XX....',
  ],
];

// Estado del juego: campos nuevos y estado nuevo
game.level = 1;            // 1..5
game.state = 'levelcomplete'; // se añade a 'start' | 'playing' | 'paused' | 'gameover' | 'won'
```

Funciones afectadas (descritas, no implementadas aquí):

- `createBricks(level)` genera los bloques a partir de `LEVELS[level - 1]`.
- `ballSpeed(level)` devuelve la velocidad de la bola del nivel; sustituye al uso directo de `BALL_SPEED` en `launchBall()` y en el rebote de la pala.
- `startLevel(level)` fija `game.level`, crea los bloques, vacía `explosions` y `particles`, centra la pala y pega la bola.

Convenciones:

- Mismas que la SPEC 01: origen arriba a la izquierda, velocidades en px/s.
- Velocidades por nivel (aprox.): 360, 389, 418, 446, 475 px/s.
- Posición de los bloques: igual que en la SPEC 01 (`x = col * BRICK_W`, `y = BRICK_TOP + fila * BRICK_H`).
- El HUD pone «NIVEL N» en una segunda línea a la izquierda, bajo «PUNTOS», sin invadir `BRICK_TOP`.

---

## Implementation plan

1. Añadir `LEVEL_COUNT`, `LEVEL_SPEED_STEP`, `LEVELS` y `game.level = 1`, y hacer que `createBricks(level)` use el patrón del nivel. `startGame()` llama con nivel 1. Prueba manual: el juego se ve igual que antes (60 bloques); en consola, `game.bricks = createBricks(2)` muestra la pirámide y lo mismo con 3, 4 y 5.
2. Añadir `ballSpeed(level)` y usarla en `launchBall()` y en el rebote de la pala. Prueba manual: en consola, `game.level = 5` antes de lanzar hace la bola claramente más rápida; con nivel 1 va como antes.
3. Mostrar «NIVEL N» en el HUD. Prueba manual: se ve «NIVEL 1» bajo la puntuación sin solapar nada.
4. Añadir `startLevel(level)` y el estado `levelcomplete`: al romper el último bloque de un nivel <5 se pasa a `levelcomplete` con pantalla «NIVEL N COMPLETADO» y Espacio o clic llama a `startLevel(level + 1)`; en el nivel 5 se llama a `endGame('won')`. `startGame()` pasa a usar `startLevel(1)`. Prueba manual: jugar o romper bloques desde consola para recorrer los 5 niveles, ver la victoria tras el 5 y comprobar que el reinicio vuelve al nivel 1.
5. Añadir el selector de nivel en la pausa: dibujar en la pantalla `paused` la fila «1 2 3 4 5» con el nivel actual resaltado y gestionar las teclas `1`–`5` y el clic sobre cada número solo en estado `paused`, llamando a `startLevel(n)` y dejando el estado listo para lanzar la bola. Prueba manual: pausar con `P`, pulsar `3` y ver el damero con la bola pegada, vidas y puntos intactos; repetir con cada nivel y comprobar que las teclas `1`–`5` no hacen nada fuera de la pausa.

6. Mover `LEVELS` de `game.js` a un nuevo `levels.js` en la raíz (script global, sin módulos) y añadir `<script src="levels.js"></script>` en `index.html` justo antes de `game.js`. `LEVEL_COUNT`, `LEVEL_SPEED_STEP` y el resto de la lógica se quedan en `game.js`. Prueba manual: el juego se comporta igual que antes (5 niveles, patrones, selector de pausa) y en consola `LEVELS.length` vale 5.

---

## Acceptance criteria

- [x] El juego tiene exactamente 5 niveles y empieza siempre en el nivel 1.
- [x] El nivel 1 tiene 60 bloques, el 2 tiene 40, el 3 tiene 30, el 4 tiene 30 y el 5 tiene 24.
- [x] Los cinco patrones son visualmente distintos: rejilla, pirámide, damero, columnas alternas y diamante.
- [x] Cada bloque conserva el color de su fila y vale 10 puntos.
- [x] La velocidad de la bola es ~360 px/s en el nivel 1 y aumenta un 8 % de la base en cada nivel (~475 px/s en el 5).
- [x] La velocidad se mantiene constante durante un mismo nivel.
- [x] Al romper el último bloque de los niveles 1 a 4 aparece «NIVEL N COMPLETADO».
- [x] Espacio o clic en esa pantalla empieza el siguiente nivel con la bola pegada a la pala y la pala centrada.
- [x] Las vidas y la puntuación se mantienen al cambiar de nivel.
- [x] Perder la bola resta una vida y recoloca la bola sin cambiar de nivel ni de patrón.
- [x] Al romper el último bloque del nivel 5 aparece la pantalla de victoria y se guarda el récord si se supera.
- [x] Con 0 vidas aparece game over; Espacio o clic reinicia en el nivel 1 con 3 vidas, 0 puntos y 60 bloques.
- [x] El HUD muestra «NIVEL N» con el nivel actual, además de puntos, récord y vidas.
- [x] Pausar con `P` o `Esc` solo funciona durante `playing` y no afecta al estado `levelcomplete`.
- [x] Al empezar un nivel no quedan explosiones ni partículas del anterior.
- [x] En la pausa se muestra el selector «1 2 3 4 5» con el nivel actual resaltado.
- [x] Pulsar `1`–`5` (o hacer clic en el número) en pausa empieza ese nivel con su patrón y su velocidad, bola pegada y pala centrada.
- [x] Al elegir nivel desde la pausa se mantienen vidas y puntuación, y no quedan explosiones ni partículas.
- [x] Las teclas `1`–`5` no tienen efecto fuera del estado `paused`.
- [x] `LEVELS` está definido en `levels.js` (cargado en `index.html` antes de `game.js`) y ya no aparece en `game.js`.
- [x] No se ha modificado ningún archivo salvo `game.js`, `levels.js` e `index.html`.
- [x] Las partículas, los sonidos (si la SPEC 03 está implementada) y el resto de reglas de las SPEC 01 y 02 no cambian.

---

## Decisions

- **Sí:** cinco niveles fijos definidos en código como cadenas `'X'`/`'.'`. Se leen a simple vista y son fáciles de ajustar.
- **Sí:** patrones propuestos: rejilla, pirámide, damero, columnas alternas y diamante. Variedad clara con bloques de un solo golpe; el usuario los revisa en este borrador.
- **Sí:** velocidad lineal sobre la base, +8 % por nivel. Subida notable pero controlable; con el límite de delta time actual (1/30 s) la bola avanza ~16 px por frame como máximo, menos que la altura de un bloque (24 px), así que no hay riesgo de túnel.
- **Sí:** color por fila en todos los niveles. Reutiliza `BRICK_COLORS` y `PARTICLE_COLORS` sin cambios.
- **Sí:** vidas y puntuación persisten entre niveles; solo se reinician en partida nueva. Hace que el nivel 5 se sienta como el final de una misma partida.
- **Sí:** pantalla intermedia «NIVEL N COMPLETADO» con Espacio o clic. Da respiro al jugador y evita que la bola salga sin avisar.
- **Sí:** victoria tras el nivel 5 reutilizando el estado `won`. No añade pantallas nuevas.
- **Sí:** «NIVEL N» en el HUD. Informa del progreso con poco coste.
- **Sí:** selector de nivel solo en la pausa, con teclas `1`–`5` y clic. Reutiliza `startLevel(n)`; mantiene vidas y puntos (se puede usar para practicar o saltar niveles, sin guardado de progreso).
- **No:** rótulo «NIVEL N» al empezar cada nivel. El usuario solo eligió el HUD.
- **No:** bloques de varios golpes o indestructibles. Ampliaría sprites y lógica; irían en otra spec.
- **No:** bucle infinito tras el nivel 5. El usuario pidió exactamente cinco niveles.
- **No:** reponer vidas por nivel. Quita tensión y no se pidió.
- **Sí:** `LEVELS` en un `levels.js` independiente (decisión del usuario). Separa los datos de los niveles de la lógica y facilita añadir o ajustar patrones. Script global, sin módulos, igual que `assets/spritesheet.js`.
- **No:** mover el resto de la lógica de niveles fuera de `game.js`. Solo los patrones van a `levels.js`.

---

## Risks

| Risk                                                                | Mitigation                                                                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `BALL_SPEED` se usa en varios sitios y queda alguno sin actualizar  | `ballSpeed(level)` es el único origen de la velocidad; buscar todas las referencias a `BALL_SPEED` en el paso 2. |
| Bola atrapada en columnas alternas (huecos de 48 px)                | El componente vertical mínimo ya está garantizado por el rebote en la pala; es un patrón superable.             |
| Pulsar Espacio dos veces rápido salta la pantalla de nivel completado | `handleAction` ignora repeticiones (`e.repeat`) y el clic cuenta una sola vez; se comprueba en pruebas.         |
| El nivel 5 tiene menos bloques que el 1 y parece más fácil           | La dificultad viene de la velocidad (+32 % sobre el nivel 1); el diamante deja poco blanco para rebotar.        |
| La victoria no guardaba récord si se cambia el flujo de `won`       | `endGame('won')` sigue siendo el único punto de salida y ya guarda el récord.                                   |

---

## What is **not** in this spec

- Bloques de varios golpes, indestructibles o con puntos distintos.
- Más de cinco niveles, bucle infinito o niveles aleatorios.
- Guardado de progreso o selector de nivel fuera de la pausa.
- Rótulo «NIVEL N» al empezar cada nivel.
- Reposición de vidas entre niveles.
- Power-ups.
- Sonido en el cambio de nivel.

Cada uno de ellos, si se aborda, irá en su propia spec.
