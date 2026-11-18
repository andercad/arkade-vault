# SPEC memory-match-01 — Memory: encuentra los pares antes de que se acabe el tiempo

> **Estado:** Borrador
> **Depende de:** SPEC 01 (reproductor y modal), SPEC 04 (migraciones de Supabase), SPEC 05 (Asteroids, patrón de motor), SPEC 06 (tablas `games` y `scores`, `submitScore`), SPEC 07 (registro genérico de juegos), SPEC 09 (Snake, patrón de motor de rejilla)
> **Fecha:** 2026-11-18
> **Objetivo:** Crear desde cero el motor TypeScript de Memory (tablero de cartas 4×4 con cursor de teclado, tiempo y movimientos) y añadirlo como juego real `memory-match` (fila en `games`, leaderboard en `scores`, registro genérico, portada y color de acento nuevo `violet`).

---

## Por qué existe esta spec

Juego nuevo y original: el clásico casual de emparejar cartas, sin copiar arte, temas ni reglas de un título comercial concreto. No hay código previo ni `references/started-games/` que portar; las cartas se dibujan con primitivas de canvas (sin assets externos).

Es un género distinto a los cinco juegos ya implementados (Asteroids, Tetris, Arkanoid, Snake, Frogger): no hay acción en tiempo real sino memoria, con cursor sobre una rejilla y una cuenta atrás. Se juega solo con teclado, así que la ficha muestra "REQUIERE TECLADO" en escritorio y el mando táctil (SPEC 12) emite las mismas teclas.

La sugerencia original pedía el color `pink`, que no está en la lista de colores permitidos de `/add-game` (`cyan|magenta|yellow|green|orange|violet|red`). Se usa `violet`, el más cercano permitido y no soportado aún por BD/código, por lo que esta spec incluye el paso "Categoría o color nuevo" de `checklist.md` (la categoría `PUZZLE` ya está soportada).

El registro genérico (`lib/game-registry.ts`) ya existe desde la SPEC 07; esta spec solo añade una entrada.

---

## Alcance

**Dentro:**

- **Motor** en `lib/memory-match/` con `createMemoryMatchGame`: diseño nuevo, sin globales, DOM ni `localStorage`.
  - Canvas lógico 600×660: franja de HUD de 60 px sobre el tablero de 600×600 con 4×4 cartas (8 pares).
  - Cursor de teclado sobre la rejilla; `Espacio` voltea la carta bajo el cursor.
  - Dos cartas volteadas forman un movimiento: si coinciden quedan emparejadas; si no, se muestran 800 ms y se vuelven a ocultar.
  - Cuenta atrás de 60 s que arranca al voltear la primera carta.
  - Victoria al emparejar los 8 pares; derrota al agotarse el tiempo.
  - Puntuación por pareja, racha y bonus final de tiempo y movimientos.
  - HUD propio del canvas: PUNTOS, PARES, MOVS y barra de TIEMPO.
- Registrar `memory-match` en `lib/game-registry.ts` (600×660, sin opciones, adaptador con `hud` Pares, Movs y Tiempo, y `touchControls` con las cuatro direcciones y el botón `Space` "VOLTEAR").
- Color de acento nuevo `violet`: migración de ampliación del CHECK de `games`, tipo `AccentColor` y estilos CSS.
- Fila `memory-match` en `games` por migración; portada `.cover-memory-match`.
- HUD de plataforma: Jugador, Puntuación, Pares, Movs y Tiempo.
- Pausa por botón y por `Esc`/`P`, FIN, modal "FIN DEL JUEGO", "JUGAR DE NUEVO", guardado con `submitScore`.
- Añadir la spec a `CLAUDE.md`, `README.md` y `references/implemented-games.md` en el mismo cambio.

**Fuera de alcance (specs futuras):**

- Niveles con tableros mayores, nivel inicial y dificultad progresiva (spec `02-memory-match-levels.md`).
- Sonido, skins, animaciones elaboradas más allá del giro de carta, modo a dos jugadores, cartas con imágenes.
- Selección de cartas con ratón o gestos sobre el canvas, controles táctiles propios más allá del `touchControls` del registro.
- Supabase Auth, anti-trampa, otros juegos, cambios de esquema en `games`/`scores` (salvo ampliar el CHECK de `color`), tests automatizados.

---

## Modelo de datos

```ts
// lib/memory-match/types.ts
export type MemoryMatchStatus = "playing" | "paused" | "gameover";

export interface MemoryMatchSnapshot {
  score: number;
  pairs: number; // parejas encontradas, 0..8
  totalPairs: number; // 8
  moves: number; // movimientos (cada dos cartas volteadas)
  timeLeft: number; // segundos enteros restantes (techo), 60..0
  status: MemoryMatchStatus;
}

export interface MemoryMatchCallbacks {
  onState(s: MemoryMatchSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface MemoryMatchGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, 0 movimientos, tablero barajado, 60 s
  end(): void; // termina con la puntuación actual
  destroy(): void;
}

export function createMemoryMatchGame(
  canvas: HTMLCanvasElement,
  callbacks: MemoryMatchCallbacks,
): MemoryMatchGame;

// lib/memory-match/symbols.ts
export type SymbolShape = "circle" | "square" | "triangle" | "diamond" | "star" | "heart" | "cross" | "moon";
export interface CardSymbol { shape: SymbolShape; color: string }
export const SYMBOLS: CardSymbol[]; // 8 símbolos distintos (forma + color)
export function drawSymbol(ctx: CanvasRenderingContext2D, s: CardSymbol, cx: number, cy: number, size: number): void;
```

```sql
-- supabase/migrations/0009_extend_games_checks.sql
alter table public.games drop constraint games_color_check;
alter table public.games add constraint games_color_check
  check (color in ('cyan','magenta','yellow','green','violet'));

-- supabase/migrations/0010_seed_memory_match.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'memory-match',
  'MEMORY',
  'Encuentra los pares antes de que se acabe el tiempo.',
  'Mueve el cursor por el tablero y voltea dos cartas por turno para encontrar sus parejas. Cada acierto en racha suma más, y terminar rápido y con pocos movimientos da un bonus.',
  'PUZZLE',
  'cover-memory-match',
  'violet',
  6
);
```

```
// Estructura de archivos nueva
lib/memory-match/constants.ts   // COLS, ROWS, CELL, CARD, HUD_H, W, H, TIME_LIMIT, MISMATCH_MS, FLIP_MS, puntuación
lib/memory-match/utils.ts       // shuffle (Fisher-Yates), cellRect, cursor clamp, scoreForPair, clearBonus, formatTime
lib/memory-match/types.ts
lib/memory-match/symbols.ts     // SYMBOLS y drawSymbol con primitivas de canvas
lib/memory-match/engine.ts      // createMemoryMatchGame
supabase/migrations/0009_extend_games_checks.sql
supabase/migrations/0010_seed_memory_match.sql
```

Convenciones del juego (valores de diseño nuevo, decididos aquí):

- Constantes: `COLS = 4`, `ROWS = 4`, `CELL = 150`, `CARD = 134` (hueco de 16 px entre cartas), `HUD_H = 60`, `W = 600`, `H = 660`, `TIME_LIMIT = 60` s, `MISMATCH_MS = 800`, `FLIP_MS = 180`, `PAIR_SCORE = 100`, `STREAK_BONUS = 50`, `TIME_BONUS = 10`, `MOVE_BONUS = 25`, `PAR_MOVES = 16`.
- Coordenadas de celda `(col, fila)` con origen arriba a la izquierda; la carta ocupa `x = col × 150 + 8`, `y = HUD_H + fila × 150 + 8`, de 134×134 px.
- Baraja: 8 símbolos duplicados, 16 cartas mezcladas con Fisher-Yates usando `Math.random`, solo dentro de `start()`/`restart()` (llamados desde `useEffect`).
- Cursor: empieza en `(0,0)`; las flechas y `W/A/S/D` lo mueven una celda por pulsación (se ignora `event.repeat`) y se detiene en los bordes (sin wrap). El cursor se dibuja con borde luminoso de 4 px y es independiente de las cartas volteadas.
- Voltear: `Space` voltea la carta bajo el cursor solo si está boca abajo, sin emparejar y hay menos de dos cartas boca arriba pendientes de resolver. Animación de giro de `FLIP_MS` (escala horizontal 1 → 0 → 1); la entrada de volteo se ignora mientras hay dos cartas pendientes de resolver, pero el cursor sí se mueve.
- Movimiento: al voltear la segunda carta, `moves += 1`. Coinciden → ambas pasan a emparejadas (`pairs += 1`) tras `FLIP_MS`; no coinciden → permanecen visibles `MISMATCH_MS` y vuelven a boca abajo; la racha se reinicia a 0.
- Temporizador: `timeLeft = 60` al iniciar; solo descuenta tras el primer volteo de la partida; el bucle usa `dt` limitado a 0,05 s y `lastTime` reiniciado en `resume()`; no descuenta en pausa. `timeLeft` del snapshot es `Math.ceil` y se emite solo cuando cambia el segundo.
- Puntuación: por pareja `PAIR_SCORE + STREAK_BONUS × (racha − 1)`, con `racha` = parejas consecutivas encontradas incluida la actual (1, 2, 3…). Al emparejar todo: bonus `TIME_BONUS × segundos enteros restantes + MOVE_BONUS × max(0, PAR_MOVES − moves)`. Máximo teórico: 800 + 1400 + 600 + 200 = 3000, muy por debajo de 1.000.000.
- Fin: emparejar la octava pareja suma el bonus final y emite `status: "gameover"` y luego `onGameOver(score)`. Agotar `timeLeft` emite lo mismo sin bonus. `end()` fuerza game over desde `playing` o `paused` con la puntuación actual. El contrato no distingue victoria de derrota (como en SPEC 08 y 09).
- Teclas (`event.code`): `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD` mueven el cursor; `Space` voltea; `Escape`/`KeyP` pausa (pulsación única, ignorando `event.repeat`, solo desde `playing`). `preventDefault` sobre flechas, `W/A/S/D` y `Space` mientras el juego está montado, también en `keyup` de `Space`. Los eventos con `target` de tipo `input`, `textarea` o `select` se ignoran. Los motores no filtran `isTrusted` (el mando táctil emite eventos sintéticos).
- Vaciar la entrada pendiente al pausar, terminar, reiniciar y en `blur` de la ventana. Las teclas pulsadas durante la pausa no actúan.
- Dibujo: fondo oscuro con tablero; carta boca abajo violeta con rejilla de rombos y signo `?`; boca arriba panel claro con el símbolo; emparejadas atenuadas con contorno verde. HUD del canvas: PUNTOS, PARES `n/8`, MOVS y barra de TIEMPO que pasa de verde a rojo. Antes del primer volteo, una línea tenue "ESPACIO: VOLTEAR" bajo el HUD. El canvas no dibuja texto de pausa ni "GAME OVER".
- Orden de eventos al terminar: snapshot con `status: "gameover"` y luego `onGameOver(score)`, una sola vez.

---

## Plan de implementación

1. **Lectura previa y constantes.**
   - Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs (AGENTS.md); revisar `components/game-player.tsx`, `components/game-canvas.tsx`, `lib/game-registry.ts` y `lib/snake/engine.ts` como patrón de motor.
   - Crear `lib/memory-match/constants.ts`, `utils.ts` y `types.ts` con los valores de "Convenciones del juego".
   - Verificación: `npx tsc --noEmit`.
2. **Símbolos de carta.**
   - Crear `lib/memory-match/symbols.ts`: `SYMBOLS` (8 formas con color propio y legibles en modo oscuro) y `drawSymbol` con primitivas de canvas.
   - Verificación: `npx tsc --noEmit` y `npm run lint`.
3. **Motor.**
   - Crear `lib/memory-match/engine.ts`: estado (baraja, cartas volteadas, racha, cursor, temporizador), resolución de movimientos, puntuación, `draw` (HUD del canvas, tablero, cartas, cursor), bucle rAF, input con cleanup (`keydown`/`keyup`/`blur`), `start/pause/resume/restart/end/destroy`, snapshot solo ante cambios y `onGameOver` único.
   - Verificación: `npx tsc --noEmit` y `npm run lint`.
4. **Registro del juego.**
   - Registrar `memory-match` en `lib/game-registry.ts`: 600×660, `aria` "Memory", sin `options`, adaptador `memoryMatchSnapshot` con `hud` `pairs` ("3/8"), `moves` y `time` ("0:45"), y `touchControls` con `dpad` de las cuatro direcciones y `actions: [{ code: "Space", label: "VOLTEAR" }]`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; los demás juegos no cambian; `/juegos/memory-match/jugar` devuelve 404 hasta que el paso 6 inserte la fila.
5. **Color nuevo `violet`.**
   - Crear `supabase/migrations/0009_extend_games_checks.sql` (CHECK `games_color_check` con `cyan, magenta, yellow, green, violet`), aplicarla con `apply_migration` y regenerar `lib/supabase/database.types.ts`.
   - Ampliar `AccentColor` en `lib/games.ts` con `"violet"`; añadir `--violet` (`#b44cff`) y los estilos de acento del color (`.neon-violet`, `.btn.violet`, `.feature-card.violet`, `.highlight.violet` y el resto de selectores por color que existan junto a `cyan|magenta|yellow|green` en `app/globals.css`; localizarlos con Grep) aplicando `/frontend-design`.
   - Verificación: `npx tsc --noEmit` y `list_migrations`.
6. **Migración seed.**
   - Crear `supabase/migrations/0010_seed_memory_match.sql`, aplicarla con `apply_migration` y regenerar `database.types.ts` si hace falta. Comprobar `select sort_order from games` y `list_migrations`; usar los siguientes libres si `0009`/`0010` o `sort_order` 6 están ocupados y reflejarlo aquí.
   - Verificación: `list_migrations`, `select id from games` incluye `memory-match`, `get_advisors` (security) sin avisos críticos, y `/juegos/memory-match/jugar` monta el canvas con tablero 4×4 y HUD.
7. **Portada y CSS.**
   - Añadir `.cover-memory-match` en `app/globals.css` (aplicar `/frontend-design`): cuadrícula de cartas violeta, una volteada con símbolo, distinguible de las demás portadas; revisar el escalado del canvas 600×660.
   - Verificación: tarjeta con acento violeta en `/juegos`, chip y ficha `/juegos/memory-match` correctos, 375 px sin desbordar.
8. **Verificación en navegador y documentación.**
   - Probar con Playwright (jugar, guardar "TEST", ver leaderboard), borrar las filas de prueba de `scores` con `execute_sql` y añadir la spec a `CLAUDE.md`, `README.md` y `references/implemented-games.md` (`memory-match`, MEMORY, PUZZLE, violet).
   - Verificación: los tres mencionan `memory-match`; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `memory-match-NN: Paso N`. Para el diseño visual (portada, color, estados) aplicar `/frontend-design`, según `CLAUDE.md`.

---

## Criterios de aceptación

**Genéricos:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `0009_extend_games_checks.sql` y `0010_seed_memory_match.sql` existen y figuran en `list_migrations`; `games` contiene `memory-match` (PUZZLE, `cover-memory-match`, violet, `sort_order` 6 o el siguiente libre) y `get_advisors` (security) no reporta avisos críticos.
- [ ] `/juegos` muestra la tarjeta MEMORY con su portada y el acento violeta; `/juegos/memory-match` carga y "JUGAR AHORA" lleva a `/juegos/memory-match/jugar`.
- [ ] La tarjeta, la ficha y el chip de filtro muestran categoría PUZZLE y acento violeta correctos; los juegos con `cyan|magenta|yellow|green` no cambian.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings.
- [ ] Las flechas, `W/A/S/D` y `Espacio` no hacen scroll en la página mientras Memory está montado.
- [ ] `PAUSA`/`REANUDAR` congela y continúa; `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en game over no tienen efecto; el canvas no dibuja texto de pausa; el overlay "EN PAUSA" muestra la pista de teclas.
- [ ] Durante la pausa, las teclas no mueven el cursor ni voltean cartas, y al reanudar el tiempo no salta.
- [ ] `Espacio` con el foco en PAUSA/FIN no activa el botón.
- [ ] Agotar el tiempo, emparejar todo y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] "JUGAR DE NUEVO" reinicia a 0 puntos, 0 movimientos, tablero barajado de nuevo y 60 s, sin teclas pegadas.
- [ ] Guardar con nombre "TEST" inserta una fila con `game_id = 'memory-match'`; nombre vacío guarda `INVITADO`; se muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación aparece en la ficha, en el Salón (tab MEMORY) y en la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [ ] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos (las flechas vuelven a hacer scroll).
- [ ] En desarrollo (StrictMode) hay una sola instancia y el temporizador va a velocidad normal.
- [ ] A 375 px de ancho el canvas se escala sin desbordar; el mando táctil solo aparece con `pointer: coarse` y sus botones (cuatro direcciones y VOLTEAR) manejan el juego sin teclas pegadas.
- [ ] Asteroids, Tetris, Arkanoid, Snake y Frogger siguen funcionando igual.
- [ ] `references/` no ha cambiado salvo lo indicado; no se escribe `localStorage`.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Memory:**

- [ ] Al iniciar, el canvas muestra 16 cartas boca abajo en rejilla 4×4, el cursor en `(0,0)` y el HUD del canvas con PUNTOS 0, PARES 0/8, MOVS 0 y barra de tiempo llena; el HUD de plataforma muestra Jugador, Puntuación 0, Pares 0/8, Movs 0 y Tiempo 1:00.
- [ ] Hay exactamente 8 símbolos distintos, cada uno en dos cartas, y el reparto cambia entre partidas.
- [ ] Las flechas y `W/A/S/D` mueven el cursor una celda por pulsación y se detiene en los bordes sin dar la vuelta.
- [ ] `Espacio` voltea la carta bajo el cursor con animación de giro; sobre una carta ya volteada o emparejada no hace nada.
- [ ] El tiempo no descuenta hasta el primer volteo y, después, baja un segundo cada segundo real.
- [ ] Voltear la segunda carta suma 1 movimiento; mientras hay dos cartas pendientes de resolver no se puede voltear una tercera, pero el cursor sí se mueve.
- [ ] Dos cartas distintas permanecen visibles 800 ms y vuelven a boca abajo; la racha se reinicia.
- [ ] Una pareja correcta suma `100 + 50 × (racha − 1)`: 100, 150, 200… en parejas consecutivas.
- [ ] Emparejar los 8 pares suma `10 × segundos restantes + 25 × max(0, 16 − movimientos)` y abre el modal con la puntuación total.
- [ ] Al llegar el tiempo a 0 la partida termina sin bonus y el modal muestra la puntuación acumulada.
- [ ] El snapshot con `status: "gameover"` precede a `onGameOver`, que se llama una sola vez por partida.
- [ ] `end()` desde pausa termina la partida con la puntuación actual.

---

## Decisiones

- **Sí:** diseño original de Memory: cartas con símbolos de primitivas de canvas, sin assets ni arte de un título concreto. Cero dependencias nuevas.
- **Sí:** registrar el juego en el registro genérico existente (SPEC 07). Cero ramas por `game.id` en `GamePlayer`.
- **Sí:** `cat` PUZZLE (ya soportada) y `color` `violet` en lugar del `pink` sugerido, porque `pink` no está en la lista permitida de `/add-game`; `violet` exige ampliar el CHECK, `AccentColor` y los estilos (paso 5). `sort_order` 6 y migraciones `0009`/`0010`, siguientes libres tras Frogger (`0008`, `sort_order` 5).
- **Sí:** migración separada `0009_extend_games_checks.sql` antes del seed, como indica `checklist.md`, y CHECK con los cinco colores soportados tras el cambio; `orange` y `red` los añadirá la spec que los necesite.
- **Sí:** sin vidas (mecánica clásica de una sola oportunidad). Los fallos ya se castigan con el tiempo y los movimientos; añadir vidas haría que un solo fallo no importara y que el tiempo dejara de ser el reto. Por eso el HUD no lleva item `lives` y el snapshot no tiene ese campo.
- **Sí:** HUD doble: HUD dibujado en el canvas (PUNTOS, PARES, MOVS y barra de TIEMPO) y HUD de plataforma de `GamePlayer` (Jugador, Puntuación + `snapshot.hud` con Pares, Movs y Tiempo). Razón: coherencia con los demás juegos y legibilidad al escalar el canvas.
- **Sí:** rejilla 4×4 con 8 pares y 60 s. Valor de diseño: una partida dura 30–60 s, el mínimo de 8 movimientos se puede lograr con memoria perfecta y el tablero cabe cómodo en 600×600 con cartas de 134 px.
- **Sí:** el tiempo arranca al primer volteo. Razón: dar margen para mirar el tablero y mover el cursor sin penalizar.
- **Sí:** cursor de teclado con `Espacio` para voltear. Razón: es "REQUIERE TECLADO", coherente con Snake/Frogger, y mapea limpio al `touchControls` del registro (4 direcciones + 1 acción). Ratón y gestos quedan fuera.
- **Sí:** puntuación con racha y bonus final de tiempo y movimientos. Razón: premia memoria y rapidez, y el máximo (3000) queda muy lejos del límite de 1.000.000 de la BD.
- **Sí:** `dt` máximo 0,05 s y `lastTime` reiniciado en `resume()`; el temporizador no corre en pausa.
- **No:** victoria distinguible en el modal o el leaderboard. El contrato `onGameOver(score)` no la distingue.
- **No:** niveles, sonido y skins en esta spec. Los niveles van en `02-memory-match-levels.md`; sonido y skins, en otras specs si llegan.
- **No:** `devicePixelRatio`; canvas lógico 600×660 escalado por CSS, como los demás juegos.

---

## Riesgos

| Riesgo                                                               | Mitigación                                                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| El CHECK de `color` falla al insertar `violet`                       | Migración `0009` va antes del seed; criterio de aceptación de que la fila se inserta y las tarjetas muestran el acento.        |
| El nombre del constraint no es `games_color_check`                   | Comprobar con `execute_sql` (`pg_constraint`) antes del paso 5 y ajustar el `drop constraint`.                                 |
| Falta algún selector por color en CSS y la tarjeta queda sin acento  | Buscar con Grep todos los selectores `cyan\|magenta\|yellow\|green` de `app/globals.css` y replicarlos para `violet`.           |
| StrictMode duplica bucle y listeners                                 | `destroy()` cancela rAF y quita listeners; criterio de una instancia.                                                         |
| `Math.random` rompe el render en servidor                            | La baraja se crea en `start()`/`restart()`, llamados solo desde `useEffect`; React renderiza el `<canvas>` vacío.             |
| Voltear una tercera carta durante la resolución rompe el emparejado  | Estado `resolving` que bloquea el volteo; el cursor sigue libre; criterio de aceptación.                                       |
| `Espacio` activa el botón con foco o hace scroll                     | `preventDefault` en `keydown` y `keyup` de `Espacio`; ignorar eventos con `target` `input/textarea/select`.                   |
| Teclas pegadas al pausar o perder foco                               | Vaciar entrada pendiente al pausar, terminar, reiniciar y en `blur`.                                                          |
| El motor filtra `isTrusted` y el mando táctil no funciona            | No filtrar; leer `e.code`.                                                                                                    |
| `sort_order` 6 o `0009`/`0010` ya ocupados al implementar            | Comprobar `select sort_order from games` y `list_migrations` en los pasos 5 y 6; usar los siguientes libres.                  |
| Datos de prueba quedan en la BD                                      | Paso 8 borra `scores`; criterio "las filas de prueba están borradas".                                                          |

---

## Qué **no** está en esta spec

- Niveles, tableros mayores, nivel inicial y dificultad progresiva (spec `02-memory-match-levels.md`).
- Sonido, skins, modo a dos jugadores, cartas con imágenes y animaciones elaboradas.
- Selección con ratón o gestos sobre el canvas y mando táctil propio (solo el `touchControls` del registro).
- Distinguir victoria de derrota en el modal o en el leaderboard.
- Supabase Auth, anti-trampa, otros juegos y cambios de esquema en `games`/`scores` salvo el CHECK de `color`.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
