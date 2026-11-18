# SPEC — Frogger: motor TypeScript (carretera, río, casas, vidas, tiempo)

> **Estado:** Aprobado
> **Depende de:** 06-games-table-leaderboard-supabase (SPEC 06), 07-tetris (registro genérico), 09-snake (patrón de motor `lib/<juego>/`)
> **Fecha:** 2026-11-17
> **Objetivo:** Crear el motor `lib/frogger/` con `createFroggerGame`: una rana que cruza una carretera y un río saltando por celdas hasta llenar 5 casas, con 3 vidas, límite de tiempo y niveles progresivos.

## Ficha del juego

| Campo     | Valor                                                                     |
| --------- | ------------------------------------------------------------------------- |
| `game-id` | `frogger`                                                                 |
| `title`   | `FROGGER`                                                                 |
| `cat`     | `ARCADE`                                                                  |
| `color`   | `lime` (no usado por los juegos existentes: magenta, cyan, yellow, green) |
| `cover`   | `cover-frogger`                                                           |
| Controles | Flechas o `W/A/S/D`: un salto de una celda por pulsación                  |
| Victoria  | Llenar las 5 casas sube de nivel (partida sin fin)                        |
| Game over | Perder las 3 vidas                                                        |

## Scope

**In:**

- Motor en `lib/frogger/` (`constants`, `types`, `utils`, `lanes`, `engine`), sin globales, DOM ni `localStorage`; todo se crea dentro de `createFroggerGame` (llamado solo desde `useEffect`).
- Canvas lógico 600×560: franja HUD de 40 px + tablero de 15×13 celdas de 40 px (600×520).
- Filas (de arriba abajo, fila 0 = casas): 0 casas (5 huecos), 1–5 río (5 carriles), 6 mediana segura, 7–11 carretera (5 carriles), 12 inicio seguro.
- Salto discreto de una celda, con animación corta (80 ms) y entrada bloqueada durante el salto.
- Carriles con objetos que se mueven a velocidad constante y envuelven (wrap) al salir por un lado.
  - Carretera: coches y camiones; solapar con la rana = muerte.
  - Río: troncos y tortugas; la rana debe estar sobre uno, y se desplaza con él; caer al agua o ser arrastrada fuera del tablero = muerte.
  - Tortugas en grupos que se sumergen cíclicamente (6 s en superficie, aviso visual 1,2 s antes, 1,5 s sumergida): sumergida = agua.
- Casas: llegar a un hueco libre lo llena; llegar a la fila 0 fuera de un hueco o a un hueco ocupado = muerte.
- Tiempo por vida: 30 s; al agotarse = muerte.
- 3 vidas; tras muerte, 0,8 s de animación y reaparición en `(7,12)`.
- Nivel: al llenar las 5 casas sube el nivel, se vacían las casas y los carriles aceleran.
- Puntuación y HUD propio del canvas: PUNTOS, VIDAS, NIVEL y barra de TIEMPO.
- Sprites con primitivas de canvas (sin assets externos).

**Fuera de alcance:**

- Integración con plataforma, registro, migración y portada (spec 02).
- Moscas, cocodrilos, serpientes y sonido (spec 03).
- Controles táctiles/mobile, Supabase Auth/RLS, Realtime en leaderboard.
- Skins, selector de nivel, récords locales, tests automatizados.

## Data model

```ts
// lib/frogger/types.ts
export type FroggerStatus = "playing" | "paused" | "gameover";

export interface FroggerSnapshot {
  score: number;
  lives: number; // 0..3
  level: number; // 1+
  homes: number; // casas llenas en el nivel actual, 0..5
  status: FroggerStatus;
}

export interface FroggerCallbacks {
  onState(s: FroggerSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface FroggerGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, 3 vidas, nivel 1
  end(): void; // termina con la puntuación actual
  destroy(): void;
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
): FroggerGame;

// lib/frogger/lanes.ts
export type LaneKind = "road" | "log" | "turtle";
export interface LaneDef {
  row: number; // 1..5 río, 7..11 carretera
  kind: LaneKind;
  dir: 1 | -1;
  speed: number; // celdas/s en nivel 1
  objLen: number; // celdas por objeto
  gap: number; // celdas entre objetos
}
export const LANES: LaneDef[];
```

Conceptos de diseño (valores nuevos decididos aquí):

- Coordenadas de celda `(col, fila)` con origen arriba-izquierda; `x = col × 40`, `y = 40 + fila × 40` (la franja HUD ocupa los primeros 40 px). Los objetos tienen `x` continuo en celdas.
- Definición de `LANES` (nivel 1, celdas/s):
  - Carretera: fila 11 coches len 1 gap 4 dir −1 speed 1,5; fila 10 coches len 1 gap 5 dir +1 speed 2,0; fila 9 camiones len 2 gap 5 dir −1 speed 1,2; fila 8 coches len 1 gap 3 dir +1 speed 2,6; fila 7 camiones len 3 gap 6 dir −1 speed 1,0.
  - Río: fila 5 tortugas len 3 gap 3 dir −1 speed 1,2; fila 4 troncos len 4 gap 3 dir +1 speed 1,5; fila 3 troncos len 6 gap 4 dir +1 speed 2,4; fila 2 tortugas len 2 gap 3 dir −1 speed 1,6; fila 1 troncos len 3 gap 3 dir +1 speed 1,8.
- Velocidad efectiva `speed × min(2.2, 1 + 0.12 × (nivel − 1))`.
- Casas: 5 huecos de 1 celda centrados en las columnas `1, 4, 7, 10, 13`; el resto de la fila 0 es muro (muerte).
- Hitbox de la rana: cuadrado de 0,6 celdas centrado en la celda. Coches: solape AABB con el objeto. Río: el centro de la rana debe caer dentro de un objeto del carril; si hay varios carriles distintos de agua, se evalúa al terminar el salto y en cada frame.
- Arrastre: `rana.x += dir × speed × dt` mientras está sobre un objeto; si `x < −0,5` o `x > 14,5` = muerte. La rana no se alinea a la rejilla mientras flota; al saltar lateralmente se ajusta a la celda más cercana antes de aplicar el salto.
- Salto: una pulsación mueve 1 celda (arriba/abajo/izq/der) con animación 80 ms; sin movimiento fuera del tablero (los saltos laterales y hacia abajo en los límites se ignoran).
- Puntuación: +10 al alcanzar por primera vez una fila más alta en la vida actual; +50 al llenar una casa; +10 × segundos restantes al llenar una casa; +1000 al completar las 5 casas. Vida extra a los 10.000 puntos y luego cada 20.000 (máximo 5 vidas).
- Máximo teórico muy por debajo de 1.000.000; `GamePlayer` ya acota al guardar.
- Teclas (`event.code`): `ArrowUp/KeyW`, `ArrowDown/KeyS`, `ArrowLeft/KeyA`, `ArrowRight/KeyD`. Pausa también con `P`/`Esc` dentro del motor (ver spec 02), además del botón de la plataforma. `preventDefault` sobre flechas y `W/A/S/D` mientras el juego está montado; se ignoran eventos con `target` `input/textarea/select` y `event.repeat`.
- Entrada ignorada en pausa, muerte en animación y game over. Se vacía la entrada pendiente en `blur`.
- Bucle rAF con `dt` limitado a 0,05 s; `lastTime` reiniciado en `resume()`.
- Orden de eventos al morir la última vida: `onState({lives: 0, status: "gameover"})` y luego `onGameOver(score)`; `lives = 0` se emite siempre antes.

## Implementation plan

1. **Constantes, tipos y utilidades.**
   - Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect` (AGENTS.md); revisar `lib/snake/engine.ts`, `lib/game-engine.ts` y `lib/tetris/engine.ts` como patrón.
   - Crear `lib/frogger/constants.ts` (`CELL=40`, `COLS=15`, `ROWS=13`, `HUD_H=40`, `W=600`, `H=560`, `START`, `HOME_COLS`, `LIVES=3`, `TIME_LIMIT=30`), `types.ts`, `utils.ts` (`laneSpeed(level)`, `aabb`, `wrap`) y `lanes.ts` (`LANES`).
   - Verificación: `npx tsc --noEmit`.
2. **Estado y objetos.**
   - Generar los objetos de cada carril repartidos a lo largo de `COLS + margen` con `objLen`/`gap`; avanzar y envolver cada frame.
   - Ciclo de inmersión de tortugas con fase desfasada por grupo.
   - Verificación: `tsc` y `npm run lint`; los objetos nunca se solapan en el mismo carril.
3. **Rana, saltos y colisiones.**
   - Salto discreto con animación, límites del tablero, detección de carretera, río (soporte y arrastre), muro y casas.
   - Muerte con animación de 0,8 s, reaparición y reinicio del tiempo y del seguimiento de "fila más alta".
   - Verificación: casos de aceptación de muerte/arrastre/casas contra la lógica.
4. **Puntuación, vidas, tiempo y niveles.**
   - Puntos, vida extra, temporizador 30 s, llenado de casas, paso de nivel y velocidad.
   - Snapshot solo ante cambios; `onGameOver` único tras `lives = 0`.
   - Verificación: `tsc` y `npm run lint`.
5. **Dibujo.**
   - `draw`: HUD (PUNTOS, VIDAS como iconos de rana, NIVEL, barra de TIEMPO que pasa de verde a rojo), tablero por franjas (agua azul, carretera gris con líneas, mediana y inicio verdes), casas, objetos (coches, camiones, troncos, tortugas con aviso de inmersión) y rana con orientación.
   - El canvas no dibuja texto de pausa ni "GAME OVER".
   - Verificación: render manual con el reproductor (spec 02).
6. **Ciclo de vida.**
   - `start/pause/resume/restart/end/destroy`, listeners en `keydown`/`keyup`/`blur` con cleanup completo, bandera `destroyed` ante StrictMode.
   - Verificación: una sola instancia en desarrollo; sin listeners tras `destroy()`.

Cada paso = un commit `frogger-core: Paso N`.

## Acceptance criteria

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `lib/frogger/` no usa `window`, `document` ni `localStorage` fuera de `createFroggerGame` (solo `canvas`, `requestAnimationFrame` y listeners con cleanup).
- [ ] Al iniciar: rana en `(7,12)`, 3 vidas, nivel 1, 0 casas, 30 s, objetos en movimiento, HUD del canvas con PUNTOS, VIDAS, NIVEL y TIEMPO.
- [ ] Una pulsación = un salto de 1 celda; mantener pulsada no repite; en los bordes el salto se ignora.
- [ ] Tocar un coche o camión mata a la rana; esquivar entre vehículos permite cruzar.
- [ ] En el río, estar sobre tronco o tortuga es seguro y arrastra a la rana; caer al agua o salir del tablero arrastrada mata.
- [ ] Las tortugas avisan 1,2 s antes de sumergirse y sumergidas equivalen a agua.
- [ ] Llegar a un hueco libre suma 50 + 10 × segundos restantes y lo marca lleno; llegar a un hueco lleno o al muro de la fila 0 mata.
- [ ] Tras morir, reaparece en `(7,12)` con el tiempo reiniciado y la fila más alta reiniciada, sin tocar las casas llenas.
- [ ] +10 por fila nueva alcanzada una sola vez por vida; no se puntúa subir y bajar repetidamente.
- [ ] Agotar los 30 s mata a la rana.
- [ ] Llenar las 5 casas suma 1000, sube el nivel, vacía las casas y aumenta la velocidad (tope ×2,2).
- [ ] Vida extra a 10.000 y luego cada 20.000 puntos, máximo 5 vidas.
- [ ] Al perder la tercera vida se emite `lives = 0` y después `onGameOver(score)` una sola vez.
- [ ] `restart()` deja 0 puntos, 3 vidas, nivel 1, casas vacías y sin teclas pegadas.
- [ ] Pausar congela objetos, rana y temporizador; al reanudar no hay salto de tiempo.
- [ ] `destroy()` cancela el rAF y quita listeners (las flechas vuelven a hacer scroll); en StrictMode hay una sola instancia.

## Decisions

- **Sí:** diseño original con la mecánica clásica de cruce de carretera y río, sin copiar arte ni mapas de un título concreto. Sprites con primitivas de canvas.
- **Sí:** 3 vidas. Razón: mecánica original del género, cada muerte es una "vida" y da margen para aprender los patrones; `1 vida` volvería el río demasiado punitivo.
- **Sí:** `onLivesChange(0)` equivalente: el snapshot con `lives = 0` se emite siempre antes que `onGameOver(score)`.
- **Sí:** HUD doble: HUD interno del canvas (PUNTOS, VIDAS, NIVEL, TIEMPO) y HUD React externo (Jugador, Puntuación, Vidas, Nivel) derivado del snapshot. Razón: coherencia con los demás juegos y legibilidad en pantallas escaladas.
- **Sí:** arquitectura del repo real (`lib/<juego>/engine.ts` + adaptador en `GAME_REGISTRY`) en lugar de un componente `components/games/FroggerGame.tsx`. Razón: así funcionan Asteroids, Tetris, Arkanoid y Snake; el contrato de callbacks `onScoreChange/onLivesChange/onLevelChange/onGameOver` se cubre con `onState(snapshot)` + `onGameOver`, que el adaptador traduce al HUD.
- **Sí:** salto discreto y carriles con velocidad constante. Razón: patrones legibles y verificables; sin física.
- **Sí:** pausa por el botón de la plataforma y por `P`/`Esc` en el motor, como los demás juegos (ver spec 02).
- **Sí:** puntuación por fila nueva y bonus de tiempo. Razón: premia avanzar rápido sin permitir farmear subiendo y bajando.
- **No:** moscas, cocodrilos, serpientes y sonido en este spec. Razón: alcance delimitado; van en spec 03.
- **No:** `devicePixelRatio`; canvas lógico escalado por CSS como los demás juegos.
- **No:** controles táctiles, Supabase Auth/RLS ni Realtime. Razón: fuera del alcance del MVP.
