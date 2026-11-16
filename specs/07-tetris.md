# SPEC 07 — Tetris: segundo juego real con registro genérico de juegos

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (reproductor y modal), SPEC 04 (migraciones de Supabase), SPEC 05 (Asteroids, patrón de motor), SPEC 06 (tablas `games` y `scores`, `submitScore`)
> **Fecha:** 2026-11-16
> **Objetivo:** Portar `references/started-games/claude-tetris` a un motor TypeScript sin globales, añadirlo como juego real `tetris` (fila en `games`, leaderboard en `scores`) y extraer un registro genérico de juegos para que `GamePlayer` deje de ramificarse por id.

---

## Por qué existe esta spec

`references/started-games/claude-tetris` es un Tetris en canvas + JS vanilla (`game.js`, ~660 líneas) que no puede pegarse tal cual en React. Inventario del original:

- **Globales y estado de módulo:** `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId` (`game.js:208-209`), más `skin`, `COLORS`, `startLevel`, `gridColor` (`game.js:93-95`, `131-134`).
- **Listeners sin cleanup:** un `keydown` en `document` (`game.js:575-603`) y los de botones, `select` y formularios (`game.js:605-647`).
- **IDs del DOM** buscados con `getElementById` (`game.js:111-141`): `board`, `next-canvas`, `score`, `lines`, `level`, `overlay*`, `pause-*`, `start-level`, `skin-select`, `theme-toggle`, `name-form`, `records*`. HUD y overlays pasan a React; solo se conserva el canvas.
- **Overlays y menús propios** que se eliminan: inicio con récords (`game.js:479-493`), game over con formulario de nombre (`game.js:430-477`), menú de pausa con "Reanudar / Reiniciar / Ver controles / Nivel inicial" (`game.js:495-528`).
- **`localStorage`:** `tetris-records` (`game.js:143-206`), `theme` (`game.js:234-238`, `649-650`) y `skin` (`game.js:643-652`). Los récords pasan a Supabase.
- **`confirm()`** al resetear récords (`game.js:627`): desaparece con los récords locales.
- **Aleatoriedad:** `Math.random` en `randomPiece` (`game.js:249`); solo puede ejecutarse dentro de `useEffect`.
- **Bucle:** `requestAnimationFrame` acumulando `dt` sin tope (`game.js:530-546`) y `init()` + `showStart()` al cargar (`game.js:656-657`).
- **Dos canvas:** tablero 300×600 (`index.html:29`) y NEXT 120×120 (`index.html:47`).

Además, `components/game-player.tsx` y `components/asteroids-canvas.tsx` están atados a Asteroids y `lib/game-registry.ts` no existe. SPEC 05 dejó anotado extraer un registro "en la spec del segundo juego real"; esta es esa spec.

---

## Alcance

**Dentro:**

- **Registro genérico de juegos** (primero, sin cambiar el comportamiento de Asteroids):
  - `lib/game-engine.ts`: contrato común (`GameEngine`, `GameSnapshot`, `GameCallbacks`, opciones del juego).
  - `lib/game-registry.ts`: id → `create`, tamaño lógico del canvas, `aria`, opciones; Asteroids se registra con un adaptador (`lib/asteroids/` no cambia).
  - `components/game-canvas.tsx` genérico (sustituye a `components/asteroids-canvas.tsx`); `GamePlayer` sin ramas por `game.id`.
  - Si el id de la BD no está en el registro, `/juegos/[id]/jugar` devuelve 404.
- **Motor** en `lib/tetris/` con `createTetrisGame`: port fiel de `game.js` sin globales, DOM ni `localStorage`.
  - Tablero 10×20, bloque 30 px, 8 piezas (I, O, T, S, Z, J, L y la **tuerca** 3×3 con hueco, `game.js:97-107`).
  - Rotación con wall kicks `[0,-1,1,-2,2]` (`game.js:276-286`), ghost piece (`game.js:318-322`, `406-411`), soft drop y hard drop, puntuación `LINE_SCORES × nivel`, niveles y gravedad.
  - **Canvas lógico 460×600:** tablero 300×600 a la izquierda y panel lateral dibujado en el mismo canvas con SCORE, LINES, LEVEL y NEXT (sustituye al `next-canvas` y al `aside.panel` DOM).
  - **4 skins** (Retro, Neon, Pastel, Pixel art; `game.js:7-91`) con cambio inmediato, y **nivel inicial 1..15** (`game.js:131-132`, `611-619`).
- **Opciones del juego en el reproductor:** selector de skin y selector de nivel inicial, declarados en el registro y renderizados por `GamePlayer`. El nivel inicial se aplica en el siguiente reinicio, como en el original (`game.js:617-619`).
- Fila `tetris` en `games` por migración `0005_seed_tetris.sql`; portada `.cover-tetris`.
- HUD de plataforma generalizado (pares etiqueta/valor): Jugador, Puntuación, Líneas, Nivel.
- Pausa por botón y por `Esc`/`P`, FIN, game over con modal, "JUGAR DE NUEVO", guardado con `submitScore` (puntuaciones en Supabase).
- Añadir la spec 07 a `CLAUDE.md` y `README.md` en el mismo cambio.

**Fuera de alcance (specs futuras):**

- Récords locales (`tetris-records`), mejor combo y líneas máximas (`game.js:143-206`, `208`, `305-307`): el ranking es Supabase.
- Tema claro/oscuro y tecla `T` (`game.js:211-238`): el tema lo da la plataforma.
- Persistir skin o nivel inicial en `localStorage` o en BD.
- Pantalla de inicio propia, menú "Ver controles" y botón "Resetear records".
- Controles táctiles (aviso "REQUIERE TECLADO"), sonido, hold piece, T-spin, bolsa de 7 piezas o cualquier cambio de reglas o balance.
- Supabase Auth, anti-trampa, otros juegos, cambios de esquema en `games`/`scores`, tests automatizados.
- Limpiar CSS de portadas de juegos eliminados (SPEC 06).

---

## Modelo de datos

```ts
// lib/game-engine.ts — contrato común (lo implementan los adaptadores del registro)
export type GameStatus = "playing" | "paused" | "gameover" | "dead";

export interface HudItem {
  key: string; // "lives" | "level" | "lines"; se usa como clase CSS `hud-stat <key>`
  label: string; // "Vidas", "Nivel", "Líneas"
  value: string; // ya formateado: "♥ ♥ ♥", "03"
}

export interface GameSnapshot {
  score: number;
  status: GameStatus;
  hud: HudItem[]; // campos propios del juego, además de Jugador y Puntuación
}

export interface GameCallbacks {
  onState(s: GameSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  end(): void;
  destroy(): void;
  setOption?(key: string, value: string): void;
}

export interface GameOption {
  key: string; // "skin" | "startLevel"
  label: string;
  choices: { value: string; label: string }[];
  defaultValue: string;
  appliesOn: "live" | "restart"; // skin: live; startLevel: restart
}
```

```ts
// lib/game-registry.ts
export interface GameDefinition {
  id: string; // = games.id
  width: number; // canvas lógico (asteroids 800, tetris 460)
  height: number; // (asteroids 600, tetris 600)
  aria: string;
  options?: GameOption[];
  create(canvas: HTMLCanvasElement, cb: GameCallbacks): GameEngine;
}
export const GAME_REGISTRY: Record<string, GameDefinition>;
export function getGameDefinition(id: string): GameDefinition | null;
```

```ts
// lib/tetris/types.ts
export type TetrisStatus = "playing" | "paused" | "gameover";
export type SkinName = "retro" | "neon" | "pastel" | "pixel";

export interface TetrisSnapshot {
  score: number;
  lines: number;
  level: number;
  status: TetrisStatus;
}

export interface TetrisCallbacks {
  onState(s: TetrisSnapshot): void;
  onGameOver(finalScore: number): void;
}

export interface TetrisGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // aplica startLevel vigente
  end(): void;
  destroy(): void;
  setSkin(name: SkinName): void; // redibuja al instante
  setStartLevel(level: number): void; // 1..15, se aplica en restart()
}

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisGame;
```

```sql
-- supabase/migrations/0005_seed_tetris.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'tetris',
  'TETRIS',
  'Encaja las piezas y limpia líneas.',
  'Apila piezas en un tablero de 10×20 y completa filas para borrarlas mientras la caída se acelera. Incluye la pieza tuerca, con un hueco central difícil de rellenar. Elige skin y nivel inicial.',
  'PUZZLE',
  'cover-tetris',
  'cyan',
  2
);
```

```
// Estructura de archivos nueva
lib/game-engine.ts
lib/game-registry.ts
components/game-canvas.tsx          // sustituye a components/asteroids-canvas.tsx
lib/tetris/constants.ts   // COLS=10, ROWS=20, BLOCK=30, W=460, H=600, PIECES, LINE_SCORES, paletas, GRID_COLOR, MAX_START_LEVEL=15
lib/tetris/utils.ts       // createBoard, collide, rotateCW, intervalForLevel, roundRectPath
lib/tetris/types.ts
lib/tetris/skins.ts       // SKINS: colors, bg, grid, draw (game.js:35-91)
lib/tetris/engine.ts      // createTetrisGame
supabase/migrations/0005_seed_tetris.sql
```

Convenciones del juego (valores idénticos al original):

- Puntuación por líneas: `LINE_SCORES = [0,100,300,500,800] × level`, usando el nivel **anterior** a recalcularlo (`game.js:309-310`). Soft drop +1 por fila (`game.js:334`); hard drop +2 por celda (`game.js:326`).
- Nivel: `startLevel + floor(lines / 10)` (`game.js:310`). Gravedad: `max(100, 1000 − (level − 1) × 90)` ms (`game.js:240-242`).
- Pieza nueva: columna `floor(COLS/2) − floor(ancho/2)`, fila 0; si colisiona al aparecer, game over (`game.js:248-252`, `347-354`). Las 8 piezas son equiprobables (`game.js:249`).
- Ghost con `globalAlpha = 0.2`; en game over no se dibuja la pieza actual (`game.js:403-404`).
- Teclas (`event.code`): `ArrowLeft`/`ArrowRight` mueven, `ArrowUp` o `KeyX` rotan, `ArrowDown` soft drop, `Space` hard drop, `Escape`/`KeyP` pausa (pulsación única, ignorando `event.repeat`; `game.js:575-603`). El original no usa mapa de teclas: cada `keydown` actúa una vez (incluida la repetición del teclado en movimiento y soft drop).
- `preventDefault` sobre las flechas y `Space` mientras el juego está montado (el original solo lo hacía con `Space`, `game.js:598`), también en `keyup` de `Space`. Los eventos con `target` de tipo `input` o `textarea` se ignoran (`game.js:576`).
- `dt` se limita a 0,05 s en el acumulador de gravedad (el original no lo limita) y `lastTime` se reinicia en `resume()` (`game.js:499-501`).
- Un solo reintento de gravedad por frame, como el original: `dropAccum` se pone a 0 al caer (`game.js:536`).
- `startLevel` se guarda al cambiar el selector y se aplica en `restart()`; el nivel inicial de la primera partida es 1. `setSkin` redibuja de inmediato.
- Skins: `retro` por defecto; `neon` pinta fondo negro y rejilla `#14141f`; las demás usan fondo transparente y rejilla `#22222e`. Sin persistencia.
- Rango de puntuación: la BD admite 0 a 1.000.000; `GamePlayer` envía `Math.min(score, 1_000_000)` a `submitScore`.

---

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs (AGENTS.md); revisar `components/game-player.tsx`, `components/asteroids-canvas.tsx` y `.crt-screen` / `.asteroids-canvas` en `app/globals.css`. Crear `lib/game-engine.ts` y `lib/game-registry.ts` con solo Asteroids (adaptador: snapshot de Asteroids → `GameSnapshot` con `hud` Vidas y Nivel; `lib/asteroids/` intacto). Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
2. Crear `components/game-canvas.tsx` genérico (ref + `useImperativeHandle`, callbacks vía ref, `destroy()` en cleanup, tamaño y `aria` del registro) y eliminar `components/asteroids-canvas.tsx`. Hacer `GamePlayer` genérico: HUD con Jugador, Puntuación y `snap.hud`; estado derivado de `snapshot.status`; `app/juegos/[id]/jugar/page.tsx` devuelve 404 si el id no está en el registro. Renombrar `.asteroids-canvas` a `.game-canvas` con `aspect-ratio` y `max-width` por inline style. Verificación: Asteroids pasa los criterios de SPEC 05 (pausa, FIN, modal, guardado, 375 px).
3. Crear `lib/tetris/constants.ts`, `utils.ts` y `types.ts` con los valores del original. Verificación: `npx tsc --noEmit`.
4. Crear `lib/tetris/skins.ts` con las 4 skins (`colors`, `bg`, `grid`, `draw`). Verificación: `npx tsc --noEmit` y `npm run lint`.
5. Crear `lib/tetris/engine.ts`: estado, `spawn`/`lockPiece`/`clearLines`, `update`/`draw` (tablero, ghost, panel lateral con SCORE, LINES, LEVEL y NEXT), bucle rAF, input con cleanup (`Esc`/`P`), `pause/resume/restart/end/destroy/setSkin/setStartLevel`, snapshot solo ante cambios. Verificación: `npx tsc --noEmit` y `npm run lint`.
6. Registrar `tetris` en `lib/game-registry.ts` (460×600, opciones `skin` en vivo y `startLevel` al reiniciar, adaptador con `hud` Líneas y Nivel). En `GamePlayer`: barra de opciones declarativa (selects que hacen `blur()` tras cambiar; `startLevel` deshabilitado mientras `status` sea `playing`), botón REINICIAR en el overlay "EN PAUSA" solo si el juego declara opciones `restart`, y puntuación acotada a 1.000.000. Verificación: `npx tsc --noEmit` y `npm run lint` pasan, y `/juegos/asteroids/jugar` no cambia (`/juegos/tetris/jugar` devuelve 404 hasta que el paso 7 inserte la fila en `games`).
7. Crear `supabase/migrations/0005_seed_tetris.sql` y aplicarla con `apply_migration`; regenerar `lib/supabase/database.types.ts` si hace falta. Verificación: `list_migrations`, `select id from games` devuelve `asteroids` y `tetris`, `get_advisors` (security) sin avisos críticos, y `/juegos/tetris/jugar` monta el canvas con tablero, panel y opciones.
8. Portada `.cover-tetris` y CSS del canvas/escalado en `app/globals.css` (aplicar `/frontend-design`; piezas en cyan, distinguible de `.cover-asteroids`). Comprobar la altura del reproductor con un canvas vertical. Verificación: tarjeta en `/juegos`, `/juegos/tetris` con portada, 375 px sin desbordar.
9. Verificar en el navegador con Playwright (jugar, guardar "TEST", ver leaderboard), borrar las filas de prueba de `scores` con `execute_sql`, y añadir la spec 07 a `CLAUDE.md` y `README.md` en el mismo commit. Verificación: ambos mencionan `07-tetris.md`; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `07-tetris: Paso N`. Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` según `AGENTS.md`. Para el diseño visual (portada, barra de opciones, estados) aplicar `/frontend-design`, según `CLAUDE.md`.

---

## Criterios de aceptación

**Genéricos:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `supabase/migrations/0005_seed_tetris.sql` existe y figura en `list_migrations`; `games` contiene `tetris` (PUZZLE, `cover-tetris`, cyan, `sort_order` 2) y `get_advisors` (security) no reporta avisos críticos.
- [ ] `/juegos` muestra la tarjeta TETRIS con su portada; `/juegos/tetris` carga y "JUGAR AHORA" lleva a `/juegos/tetris/jugar`.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings.
- [ ] `PAUSA`/`REANUDAR` congela y continúa; `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en game over no tienen efecto; el canvas no dibuja texto de pausa; el overlay "EN PAUSA" muestra la pista de teclas.
- [ ] Durante la pausa, las teclas de juego no mueven, rotan ni sueltan la pieza, y al reanudar no cae de golpe.
- [ ] `Espacio` con el foco en PAUSA/FIN no activa el botón; con el foco en un selector de opciones, flechas y `Espacio` no lo cambian (se hace `blur` tras elegir).
- [ ] Las flechas y `Espacio` no hacen scroll en la página mientras Tetris está montado.
- [ ] Perder (la pieza nueva no cabe) y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] "JUGAR DE NUEVO" reinicia tablero, puntuación 0, líneas 0 y nivel inicial elegido.
- [ ] Guardar con nombre "TEST" inserta una fila con `game_id = 'tetris'`; nombre vacío guarda `INVITADO`; se muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación aparece en la ficha, en el Salón (tab TETRIS) y en la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [ ] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos (las flechas vuelven a hacer scroll).
- [ ] En desarrollo (StrictMode) hay una sola instancia y la caída va a velocidad normal.
- [ ] A 375 px de ancho el canvas se escala sin desbordar; en escritorio la altura del reproductor cabe sin recortar el tablero.
- [ ] `/juegos/asteroids/jugar` funciona como antes (criterios de SPEC 05) y `GamePlayer` no contiene ramas por `game.id`.
- [ ] Un id presente en `games` pero ausente del registro devuelve 404 en `/juegos/<id>/jugar`.
- [ ] `references/started-games/` y `lib/asteroids/` no han cambiado; no se escribe `localStorage` (`tetris-records`, `theme`, `skin`).
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Tetris:**

- [ ] Al iniciar, el canvas muestra el tablero 10×20 vacío, una pieza en la fila 0 y el panel con SCORE 0, LINES 0, LEVEL 1 y NEXT con la pieza siguiente; el HUD de plataforma muestra Jugador, Puntuación, Líneas y Nivel.
- [ ] Existen 8 tipos de pieza; la tuerca ocupa 3×3 con la celda central vacía.
- [ ] `←` y `→` mueven una columna sin salir del tablero; `↑` y `X` rotan en sentido horario; una rotación que choca prueba los desplazamientos `0, −1, +1, −2, +2` y se descarta si ninguno cabe.
- [ ] `↓` baja una fila y suma 1 punto; si no puede bajar, fija la pieza.
- [ ] `Espacio` suelta la pieza hasta el ghost y suma 2 puntos por celda recorrida.
- [ ] El ghost se dibuja con transparencia 0,2 donde aterrizará la pieza, y no se dibuja la pieza actual en game over.
- [ ] Borrar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 multiplicado por el nivel previo al recálculo.
- [ ] El nivel es `nivel inicial + floor(líneas / 10)` y sube al llegar a 10 líneas desde el nivel inicial.
- [ ] El intervalo de caída es `max(100, 1000 − (nivel − 1) × 90)` ms (nivel 1 → 1000 ms; nivel 11 → 100 ms).
- [ ] El selector de nivel inicial ofrece 1 a 15, está deshabilitado mientras se juega, y tras REINICIAR (pausa) o "JUGAR DE NUEVO" la partida empieza en ese nivel con su gravedad.
- [ ] El selector de skin ofrece Retro, Neon, Pastel y Pixel art; el cambio se ve al instante, sin reiniciar, en tablero, NEXT y ghost.
- [ ] Una puntuación mayor que 1.000.000 se envía como 1.000.000.

---

## Decisiones

- **Sí:** extraer el registro genérico en esta spec (decisión del usuario, y lo preveía SPEC 05). Evita un segundo `if (game.id === ...)` en `GamePlayer` y deja listo el tercer juego.
- **No:** ramificar `GamePlayer` por id para Tetris. Contradice `checklist.md` y duplica la deuda de SPEC 05.
- **Sí:** adaptador de Asteroids dentro del registro, sin tocar `lib/asteroids/`. Su comportamiento y sus criterios de SPEC 05/06 no cambian.
- **Sí:** contrato `GameSnapshot` con `hud` de pares etiqueta/valor ya formateados. `GamePlayer` no necesita conocer vidas, líneas ni niveles.
- **Sí:** port fiel de `game.js` (reglas, puntuación, gravedad, kicks, ghost) en `lib/tetris/`. Nada de rebalanceo.
- **Sí:** pieza tuerca incluida (decisión del usuario). Es mecánica del original (`game.js:106`).
- **Sí:** 4 skins y nivel inicial 1..15 (decisión del usuario). Opciones declarativas en el registro, no hardcodeadas en `GamePlayer`.
- **Sí:** NEXT y datos del panel dibujados dentro del canvas (460×600). Un solo canvas; el HUD propio se mantiene como en Asteroids, y el HUD de plataforma se alimenta del snapshot.
- **No:** segundo canvas DOM para NEXT. Más superficie de ciclo de vida y hydration.
- **Sí:** puntuaciones en Supabase con `submitScore` (decisión del usuario); récords locales, combo y líneas máximas quedan fuera.
- **No:** tema claro/oscuro ni tecla `T`, ni `localStorage` para skin y nivel. El tema es de la plataforma; persistir opciones merece su propia spec.
- **Sí:** nivel inicial aplicado en el siguiente reinicio, como el original (`game.js:617-619`), con REINICIAR en el overlay de pausa solo para juegos con opciones de reinicio. Sin pantalla de inicio, es la única forma de cambiarlo.
- **Sí:** limitar `dt` a 0,05 s en la gravedad (checklist). Efecto práctico mínimo: el original ya cae como máximo una fila por frame.
- **Sí:** `preventDefault` en flechas y `Espacio` (el original solo en `Espacio`), imprescindible para no hacer scroll en la plataforma.
- **No:** ignorar `event.repeat` en movimientos, soft drop o hard drop. Es comportamiento del original; cambiarlo sería rebalancear.
- **Sí:** acotar la puntuación a 1.000.000 al guardar, por el CHECK de BD. Con nivel inicial 15 es improbable llegar, pero evita un insert fallido.
- **Sí:** `sort_order` 2, `cat` PUZZLE y color cyan (decisión del usuario); `short` y `long` redactados a partir del README del original.
- **Sí:** `GAME_REGISTRY` es la lista de juegos jugables; la BD sigue siendo la fuente del catálogo. Un id sin motor devuelve 404.

---

## Riesgos

| Riesgo                                                                      | Mitigación                                                                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Regresión de Asteroids al extraer el registro                               | Paso 2 aislado antes de tocar Tetris; se revalidan los criterios de SPEC 05; `lib/asteroids/` no se modifica.     |
| StrictMode duplica bucle y listeners                                        | `destroy()` cancela rAF y quita todos los listeners; criterio de una sola instancia.                              |
| Canvas vertical (460×600) no cabe en la altura del reproductor              | Revisar `.crt-screen` en el paso 1 y fijar `max-width` / límite de altura en el paso 8; comprobar en escritorio.  |
| `Math.random` en el render provoca hydration mismatch                       | Motor y piezas solo se crean en `useEffect`; React renderiza el `<canvas>` vacío.                                 |
| Foco en un `select` de opciones hace que flechas y `Espacio` cambien opción | `blur()` tras cada cambio y el motor ignora eventos con `target` `input`/`textarea`; criterio de aceptación.      |
| `dt` grande al volver de otra pestaña suelta varias piezas                  | Tope de 0,05 s y `lastTime` reiniciado en `resume()`; el original solo cae una fila por frame.                    |
| Mantener `Espacio` encadena hard drops y termina la partida                 | Comportamiento heredado del original; riesgo aceptado, un cambio de reglas va en otra spec.                       |
| Skin Neon usa `shadowBlur` en cada bloque y baja el rendimiento             | Redibujo completo por frame como el original (tablero pequeño); medir al implementar y registrar si hay problema. |
| Nivel inicial alto infla la puntuación del leaderboard                      | Riesgo aceptado, como las puntuaciones falsificables de SPEC 06; ranking por nivel inicial sería otra spec.       |
| Puntuación fuera del rango del CHECK (0 a 1.000.000)                        | Acotado en `GamePlayer` antes de `submitScore`; criterio de aceptación.                                           |
| Teclas pegadas al pausar o perder foco                                      | Sin mapa de teclas (acción por `keydown`); en pausa, game over y `blur` se ignora la entrada.                     |
| `sort_order` 2 ya ocupado cuando se implemente                              | Comprobar `select sort_order from games` en el paso 7; usar el siguiente libre y reflejarlo aquí.                 |
| Datos de prueba quedan en la BD                                             | Paso 9 borra `scores`; criterio "las filas de prueba están borradas".                                             |

---

## Qué **no** está en esta spec

- Récords locales, mejor combo, líneas máximas y botón "Resetear records".
- Tema claro/oscuro, tecla `T` y persistencia de skin o nivel inicial.
- Pantalla de inicio propia, menú "Ver controles" y overlays del original.
- Controles táctiles, sonido, hold piece, T-spin, bolsa de 7 piezas y cambios de reglas o balance.
- Supabase Auth, anti-trampa, cambios de esquema en `games`/`scores` y otros juegos.
- Limpieza de CSS de portadas de juegos eliminados.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
