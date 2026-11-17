# SPEC 09 — Snake: cuarto juego real, diseño nuevo con sprites de frutas

> **Estado:** Implementado
> **Depende de:** SPEC 01 (reproductor y modal), SPEC 04 (migraciones de Supabase), SPEC 05 (Asteroids, patrón de motor), SPEC 06 (tablas `games` y `scores`, `submitScore`), SPEC 07 (registro genérico de juegos), SPEC 08 (migración 0006, patrón de assets en `public/games/`)
> **Fecha:** 2026-11-16
> **Objetivo:** Crear desde cero un motor TypeScript de Snake que use las frutas de `references/source-assets/snake-assets`, añadirlo como juego real `snake` (fila en `games`, leaderboard en `scores`) y registrarlo en el registro genérico de juegos.

---

## Por qué existe esta spec

No hay código original: solo existen los sprites en `references/source-assets/snake-assets/`. Hay que diseñar el juego completo. Inventario de los assets:

- `fruits.png`: hoja de 3790×442 px con fondo transparente (585 KB) y tres filas de frutas (realistas, pixel art y vectoriales). El atlas solo usa la fila central de **pixel art** (`y = 136`, alto 160).
- `sprites.js`: atlas `window.SPRITE_ATLAS` (`sprites.js:14`) con 22 frutas `{ x, y, w, h }` (`sprites.js:23-44`) y la ruta `snake-assets/fruits.png` (`sprites.js:17`). Es un global de `window` y no puede importarse tal cual: se porta a un módulo TS.
- No hay sprites de serpiente, tablero ni sonido: la serpiente y el tablero se dibujan con primitivas de canvas.

Es un juego **original**: mecánica clásica de serpiente que come y crece, sin copiar arte, niveles ni reglas de un título concreto. Los sprites son del usuario y se usan como pidió.

El registro genérico (`lib/game-registry.ts`) ya existe desde la SPEC 07; esta spec solo añade una entrada.

---

## Alcance

**Dentro:**

- **Motor** en `lib/snake/` con `createSnakeGame`: diseño nuevo, sin globales, DOM ni `localStorage`.
  - Canvas lógico 600×630: franja de HUD de 30 px sobre el tablero de 20×20 celdas de 30 px (600×600); sin panel lateral.
  - Serpiente de longitud 3 al centro, avanza a la derecha; se mueve por pasos fijos de celda.
  - Una fruta a la vez en una celda libre, elegida al azar entre las 22 del atlas; al comerla, la serpiente crece 1 y aparece otra.
  - Muerte al chocar con pared o con el propio cuerpo (decisión del usuario).
  - **Nivel** `1 + floor(frutas / 5)`; el intervalo de paso baja con el nivel (ver Convenciones).
  - Puntuación `10 × nivel` por fruta.
  - HUD propio del canvas: PUNTOS, NIVEL y LONGITUD.
- Asset `public/games/snake/fruits.png` (copia de `fruits.png`).
- Registrar `snake` en `lib/game-registry.ts` (600×630, sin opciones, adaptador con `hud` Longitud y Nivel).
- Fila `snake` en `games` por migración `0007_seed_snake.sql`; portada `.cover-snake`.
- HUD de plataforma: Jugador, Puntuación, Longitud, Nivel.
- Pausa por botón y por `Esc`/`P`, FIN, game over, "JUGAR DE NUEVO", guardado con `submitScore`.
- Añadir la spec 09 a `CLAUDE.md` y `README.md` en el mismo cambio.

**Fuera de alcance (specs futuras):**

- Modo sin paredes (wrap), obstáculos, varias frutas, frutas especiales o bonus por tiempo.
- Sonido, skins, selector de nivel o velocidad, récords locales en `localStorage`.
- Sprites propios para la serpiente (se dibuja con primitivas).
- Controles táctiles (aviso "REQUIERE TECLADO"), pantalla completa.
- Supabase Auth, anti-trampa, otros juegos, cambios de esquema en `games`/`scores`, tests automatizados.

---

## Modelo de datos

```ts
// lib/snake/types.ts
export type SnakeStatus = "playing" | "paused" | "gameover";

export interface SnakeSnapshot {
  score: number;
  length: number; // celdas de la serpiente
  level: number; // 1+
  status: SnakeStatus;
}

export interface SnakeCallbacks {
  onState(s: SnakeSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface SnakeGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, longitud 3, nivel 1
  end(): void;
  destroy(): void;
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeGame;
```

```ts
// lib/snake/sprites.ts (portado de references/source-assets/snake-assets/sprites.js:23-44)
export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export const FRUITS: Record<string, Frame>; // 22 frutas, fila y=136, h=160
export function loadSpritesheet(onLoad, onError): () => void; // cancelable
```

```sql
-- supabase/migrations/0007_seed_snake.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'snake',
  'SNAKE',
  'Come frutas y crece sin chocarte.',
  'Guía a la serpiente por el tablero, come frutas para crecer y evita las paredes y tu propio cuerpo. Cada cinco frutas subes de nivel y la serpiente se mueve más rápido.',
  'ARCADE',
  'cover-snake',
  'green',
  4
);
```

```
// Estructura de archivos nueva
lib/snake/constants.ts   // COLS, ROWS, CELL, W, H, INITIAL_LENGTH, FRUITS_PER_LEVEL, intervalos, SPRITESHEET_SRC
lib/snake/utils.ts       // stepInterval(level), randomFreeCell, opposite
lib/snake/types.ts
lib/snake/sprites.ts     // FRUITS, carga de la imagen, drawFruit
lib/snake/engine.ts      // createSnakeGame
public/games/snake/fruits.png
supabase/migrations/0007_seed_snake.sql
```

Convenciones del juego (valores de diseño nuevo, decididos aquí):

- Coordenadas de celda `(col, fila)` con origen arriba a la izquierda; `x = col × 30`.
- Inicio: cuerpo `(10,10)`, `(9,10)`, `(8,10)` (cabeza primero), dirección derecha.
- Paso: acumulador con `dt` limitado a 0,05 s; cada `stepInterval(level)` ms la serpiente avanza una celda. `stepInterval = max(70, 140 − (nivel − 1) × 10)` ms (nivel 1 → 140 ms; nivel 8 → 70 ms).
- Colisión: la cabeza nueva sale del tablero o coincide con una celda del cuerpo. La cola que se retira en ese mismo paso **no** cuenta como colisión (si no se come fruta).
- Fruta: celda libre aleatoria (no ocupada por la serpiente), tipo aleatorio de las 22 claves de `FRUITS`. Se elige con `Math.random` solo dentro de `useEffect`. Si no queda celda libre, la partida termina (victoria) y se notifica por `onGameOver`.
- Comer: `frutas += 1`, `score += 10 × nivel` con el nivel previo al recálculo, la serpiente crece 1 (no retira la cola ese paso), nivel `1 + floor(frutas / 5)`.
- Sprite de fruta: se dibuja con altura de 30 px y ancho proporcional (`sw / sh × 30`), centrada en la celda; el original mide ~110-170 × 160, así que cabe sin deformarse.
- Serpiente: segmentos como cuadrados redondeados verdes (`#39ff14` cabeza, `#22b80c` cuerpo) con ojos en la cabeza según la dirección. Tablero con rejilla tenue.
- Teclas (`event.code`): `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD` cambian la dirección; `Escape`/`KeyP` pausa (pulsación única, ignorando `event.repeat`, solo desde `playing`).
- Cola de direcciones de máximo 2 entradas: cada giro se valida contra la última dirección encolada, nunca se admite el giro de 180° (impide morir por dos pulsaciones rápidas dentro de un mismo paso).
- `preventDefault` sobre flechas y `W/A/S/D` mientras el juego está montado, también en `keyup` de `Space`. Los eventos con `target` de tipo `input`, `textarea` o `select` se ignoran.
- Vaciar la cola de direcciones al pausar, terminar, reiniciar y en `blur` de la ventana. Las teclas pulsadas durante la pausa no actúan.
- El bucle no arranca hasta que la imagen carga; si `destroy()` llega antes, no se arranca. Si la imagen falla, `console.error` y el juego sigue sin sprites (la fruta se dibuja como círculo de color).
- Rango de puntuación: máximo teórico 397 frutas; con nivel acotado por el tablero el total queda muy por debajo de 1.000.000. `GamePlayer` ya acota al guardar.

---

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components, `useEffect`/refs y a servir archivos estáticos de `public/` (AGENTS.md); revisar `components/game-player.tsx`, `components/game-canvas.tsx`, `lib/game-registry.ts` y `lib/tetris/engine.ts` como patrón. Copiar `fruits.png` a `public/games/snake/` y crear `lib/snake/constants.ts`, `utils.ts` y `types.ts`. Verificación: `npx tsc --noEmit`; `/games/snake/fruits.png` responde 200 con el servidor de desarrollo.
2. Crear `lib/snake/sprites.ts`: `FRUITS` portado de `sprites.js:23-44`, carga cancelable de la imagen y `drawFruit`. Verificación: `npx tsc --noEmit` y `npm run lint`.
3. Crear `lib/snake/engine.ts`: estado, paso por acumulador, colisiones, fruta, nivel y puntuación, `draw` (rejilla, fruta, serpiente, HUD del canvas), bucle rAF tras cargar la imagen, input con cleanup y cola de direcciones, `pause/resume/restart/end/destroy`, snapshot solo ante cambios y `onGameOver` único. Verificación: `npx tsc --noEmit` y `npm run lint`.
4. Registrar `snake` en `lib/game-registry.ts` (600×630, `aria` "Snake", sin opciones, adaptador con `hud` Longitud y Nivel). Verificación: `npx tsc --noEmit` y `npm run lint` pasan; los demás juegos no cambian; `/juegos/snake/jugar` devuelve 404 hasta que el paso 5 inserte la fila en `games`.
5. Crear `supabase/migrations/0007_seed_snake.sql` y aplicarla con `apply_migration`; regenerar `lib/supabase/database.types.ts` si hace falta. Comprobar `select sort_order from games` y usar el siguiente libre si el 4 está ocupado. Verificación: `list_migrations`, `select id from games` incluye `snake`, `get_advisors` (security) sin avisos críticos, y `/juegos/snake/jugar` monta el canvas con tablero, serpiente, fruta y HUD.
6. Portada `.cover-snake` en `app/globals.css` (aplicar `/frontend-design`; serpiente verde y fruta, distinguible de las demás portadas) y comprobación del escalado del canvas 600×630. Verificación: tarjeta en `/juegos`, `/juegos/snake` con portada, 375 px sin desbordar.
7. Verificar en el navegador con Playwright (jugar, guardar "TEST", ver leaderboard), borrar las filas de prueba de `scores` con `execute_sql`, y añadir la spec 09 a `CLAUDE.md` y `README.md` en el mismo commit. Verificación: ambos mencionan `09-snake.md`; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `09-snake: Paso N`. Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` según `AGENTS.md`. Para el diseño visual (portada, estados) aplicar `/frontend-design`, según `CLAUDE.md`.

---

## Criterios de aceptación

**Genéricos:**

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `supabase/migrations/0007_seed_snake.sql` existe y figura en `list_migrations`; `games` contiene `snake` (ARCADE, `cover-snake`, green, `sort_order` 4 o el siguiente libre) y `get_advisors` (security) no reporta avisos críticos.
- [x] `/juegos` muestra la tarjeta SNAKE con su portada; `/juegos/snake` carga y "JUGAR AHORA" lleva a `/juegos/snake/jugar`.
- [x] El canvas arranca sin errores en la consola ni hydration warnings, y `fruits.png` carga con 200.
- [x] `PAUSA`/`REANUDAR` congela y continúa; `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en game over no tienen efecto; el canvas no dibuja texto de pausa; el overlay "EN PAUSA" muestra la pista de teclas.
- [x] Durante la pausa, las teclas de dirección no cambian el rumbo de la serpiente, y al reanudar no avanza varios pasos de golpe.
- [x] `Espacio` con el foco en PAUSA/FIN no activa el botón.
- [x] Las flechas y `W/A/S/D` no hacen scroll en la página mientras Snake está montado.
- [x] Chocar con pared o cuerpo y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [x] "JUGAR DE NUEVO" reinicia a puntuación 0, longitud 3, nivel 1 y dirección derecha, sin teclas pegadas.
- [x] Guardar con nombre "TEST" inserta una fila con `game_id = 'snake'`; nombre vacío guarda `INVITADO`; se muestra "PUNTUACIÓN GUARDADA_".
- [x] La puntuación aparece en la ficha, en el Salón (tab SNAKE) y en la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [x] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos (las flechas vuelven a hacer scroll).
- [x] En desarrollo (StrictMode) hay una sola instancia y la serpiente va a velocidad normal.
- [x] A 375 px de ancho el canvas se escala sin desbordar; el aviso táctil solo aparece con `pointer: coarse`.
- [x] Asteroids, Tetris y Arkanoid siguen funcionando igual.
- [x] `references/` y `lib/asteroids/`, `lib/tetris/`, `lib/arkanoid/` no han cambiado; no se escribe `localStorage`.
- [x] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Snake:**

- [x] Al iniciar, el canvas muestra el tablero 20×20, una serpiente de 3 celdas en `(10,10)`, `(9,10)`, `(8,10)` mirando a la derecha, una fruta en una celda libre y el HUD del canvas con PUNTOS 0, NIVEL 1 y LONGITUD 3; el HUD de plataforma muestra Jugador, Puntuación 0, Longitud 3 y Nivel 01.
- [x] La fruta se dibuja con el sprite del atlas sin deformarse, y siempre en una celda no ocupada por la serpiente.
- [x] Las 22 frutas del atlas pueden aparecer.
- [x] La serpiente avanza una celda cada 140 ms en el nivel 1 y no se mueve entre pasos.
- [x] Las flechas y `W/A/S/D` giran la serpiente; invertir el sentido (180°) se ignora, incluso con dos pulsaciones rápidas dentro de un mismo paso.
- [x] Comer una fruta suma `10 × nivel` (nivel previo al recálculo), alarga la serpiente 1 celda y genera una fruta nueva.
- [x] El nivel es `1 + floor(frutas / 5)` y sube al comer la quinta fruta.
- [x] El intervalo de paso es `max(70, 140 − (nivel − 1) × 10)` ms (nivel 1 → 140 ms; nivel 8 y superiores → 70 ms).
- [x] Salir por cualquier borde del tablero termina la partida; el modal muestra la puntuación acumulada.
- [x] Moverse hacia la celda del propio cuerpo termina la partida; moverse hacia la celda de la cola que se libera en ese paso (sin comer) no.
- [x] Llenar las 400 celdas termina la partida sin errores.
- [x] Si `fruits.png` falla, la fruta se dibuja como círculo y el juego sigue siendo jugable.

---

## Decisiones

- **Sí:** diseño nuevo y original: serpiente clásica de celdas, sin copiar arte ni reglas de un título concreto. Los sprites de frutas son los del usuario.
- **Sí:** registrar el juego en el registro genérico existente (SPEC 07). Cero ramas por `game.id` en `GamePlayer`.
- **Sí:** muerte al chocar con paredes (decisión del usuario). Es la regla clásica y la más simple de verificar; el modo wrap queda fuera.
- **Sí:** nivel cada 5 frutas con intervalo `max(70, 140 − (nivel − 1) × 10)` ms (decisión del usuario). Valores de diseño: 70 ms es el mínimo jugable a 30 px de celda, y se alcanza en el nivel 8.
- **Sí:** puntuación `10 × nivel`. Recompensa jugar en niveles altos sin exceder jamás el límite de 1.000.000 de la BD.
- **Sí:** HUD de plataforma con Longitud y Nivel (decisión del usuario), derivado del snapshot como los demás juegos.
- **Sí:** `cat` ARCADE y `color` green (decisión del usuario); `sort_order` 4 y migración `0007`, siguientes libres tras Arkanoid (SPEC 08).
- **Sí:** solo la fila de pixel art del atlas (`y = 136`), la que define `sprites.js`. Estilo coherente con la estética arcade de la plataforma.
- **Sí:** serpiente y tablero con primitivas de canvas; no hay sprites de serpiente.
- **Sí:** cola de direcciones de máximo 2 y prohibición de giro de 180°. Sin ella, dos pulsaciones rápidas dentro de un paso matan injustamente.
- **Sí:** paso por acumulador con `dt` máximo 0,05 s (checklist) y `lastTime` reiniciado en `resume()`. Con paso fijo de celda no hay riesgo de atravesar nada.
- **Sí:** copiar el PNG íntegro a `public/` (585 KB) y dejar `references/` intacto. Recortar la hoja es optimización posible en otra spec.
- **No:** sonido, skins, selector de nivel, récords locales. Sin original al que ser fieles, se mantiene el mínimo viable.
- **No:** `devicePixelRatio`; canvas lógico 600×630 escalado por CSS, como los demás juegos.
- **Sí:** victoria al llenar el tablero se notifica por `onGameOver`; el contrato no distingue victoria (como en SPEC 08).

---

## Riesgos

| Riesgo                                                            | Mitigación                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| SPEC 08 aún no está integrada y `lib/game-registry.ts` la importa | Implementar esta spec sobre la rama con SPEC 08 ya fusionada; comprobar `0006` y `sort_order` antes del paso 5.  |
| StrictMode duplica bucle y listeners                              | `destroy()` cancela rAF y quita listeners; bandera `destroyed` en la carga de imagen; criterio de una instancia. |
| `Math.random` o `Image` rompen el render en servidor              | Todo se crea dentro de `createSnakeGame`, llamado solo desde `useEffect`; React renderiza el `<canvas>` vacío.   |
| Giro de 180° por pulsaciones rápidas                              | Cola de 2 direcciones validada contra la última encolada; criterio de aceptación.                                |
| Fruta aparece sobre la serpiente o sin celdas libres              | `randomFreeCell` excluye el cuerpo; sin celdas libres, fin de partida con victoria.                              |
| La imagen (585 KB) tarda en cargar o falla                        | Bucle al cargar; si falla, `console.error` y fruta como círculo; el juego sigue siendo jugable.                  |
| Atlas con recortes que incluyan píxeles de la fruta vecina        | Comprobar visualmente las 22 frutas en el paso 3 y ajustar el recorte solo si hay solape.                        |
| Teclas pegadas al pausar o perder foco                            | Vaciar la cola al pausar, terminar, reiniciar y en `blur`; entrada ignorada en pausa y game over.                |
| Foco en un botón o selector intercepta teclas                     | Ignorar eventos con `target` `input`/`textarea`/`select`; `preventDefault` en `keyup` de `Espacio`.              |
| `sort_order` 4 ya ocupado cuando se implemente                    | Comprobar `select sort_order from games` en el paso 5; usar el siguiente libre y reflejarlo aquí.                |
| Datos de prueba quedan en la BD                                   | Paso 7 borra `scores`; criterio "las filas de prueba están borradas".                                            |

---

## Qué **no** está en esta spec

- Modo wrap, obstáculos, varias frutas, frutas especiales y bonus por tiempo.
- Sonido, skins, selector de nivel o velocidad y récords locales.
- Sprites propios de serpiente.
- Distinguir victoria de derrota en el modal o en el leaderboard.
- Controles táctiles y pantalla completa.
- Supabase Auth, anti-trampa, cambios de esquema en `games`/`scores` y otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
