# SPEC sokoban-01 — SOKOBAN: motor TypeScript, cinco niveles y deshacer

> **Estado:** Borrador
> **Depende de:** SPEC 01 (reproductor y modal), SPEC 04 (migraciones de Supabase), SPEC 05 (Asteroids, patrón de motor), SPEC 06 (tablas `games` y `scores`, `submitScore`), SPEC 07 (registro genérico), SPEC 08 (patrón de niveles `lib/arkanoid/levels.ts`), SPEC 12 y 13 (mando táctil), SPEC 14 (`lib/canvas-cache.ts`), SPEC 15 (color por categoría), SPEC 18 (solo los jugadores con sesión guardan puntuación)
> **Fecha:** 2026-11-24
> **Objetivo:** Crear el motor `lib/sokoban/` con `createSokobanGame` y registrarlo como juego real `sokoban` (fila en `games`, portada, leaderboard en `scores`): un operario que empuja cajas a sus marcas en cinco niveles, con deshacer ilimitado y reinicio de nivel.

## Por qué existe esta spec

Tema de la game jam: "Sokoban", tomado de la tabla de sugeridos ("Empuja cajas a objetivos con deshacer. Niveles como Arkanoid. Dif. M."). No hay código original en `references/started-games/`: es un diseño nuevo.

El género (empujar cajas por una rejilla sin poder tirar de ellas) es una mecánica genérica. Esta spec no copia nombres, arte ni mapas de ningún título ni colección de niveles: los cinco mapas están diseñados aquí y su solubilidad se ha comprobado con una búsqueda exhaustiva (BFS) sobre estados (posición del operario + cajas).

Es el primer juego del catálogo **por turnos**: no hay `dt` que afecte a las reglas. El bucle `requestAnimationFrame` solo dibuja y gestiona la repetición de teclas mantenidas. Hay que decidir cómo se puntúa un puzle (por nivel, con bonus de eficiencia y penalización por deshacer) para que el leaderboard de `scores` tenga sentido.

El registro genérico (`lib/game-registry.ts`) ya existe: esta spec solo añade una entrada, el adaptador y su `touchControls`.

## Ficha del juego

| Campo        | Valor                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- |
| `game-id`    | `sokoban`                                                                                     |
| `title`      | `SOKOBAN`                                                                                     |
| `cat`        | `PUZZLE`                                                                                      |
| `color`      | `cyan` (= `CATEGORY_COLOR['PUZZLE']`, SPEC 15; coincide con la tabla de sugeridos)            |
| `cover`      | `cover-sokoban`                                                                               |
| `sort_order` | `6` (los seeds existentes ocupan 1-5)                                                         |
| Migración    | `supabase/migrations/0014_seed_sokoban.sql` (la última existente es `0013`)                   |
| Canvas       | 576×480 lógicos                                                                               |
| Controles    | Flechas o `W/A/S/D` mover; `Z`/`U`/`Backspace` deshacer; `R` reiniciar nivel; `Esc`/`P` pausa |
| Victoria     | Completar los 5 niveles (cierra la partida con `onGameOver`)                                  |
| Derrota      | No existe: sin vidas ni tiempo; la partida también termina con FIN                            |

## Alcance

**Dentro:**

- Motor en `lib/sokoban/` (`constants`, `types`, `utils`, `levels`, `engine`) con `createSokobanGame`, sin globales, DOM ni `localStorage`; todo se crea dentro de `createSokobanGame` (llamado solo desde `useEffect`).
- Canvas lógico 576×480: franja HUD de 48 px + tablero máximo de 12×9 celdas de 48 px (576×432). Cada nivel se centra en el tablero.
- Reglas: el operario se mueve una celda por pulsación; si la celda destino tiene una caja y la siguiente celda está libre (ni muro ni otra caja), la empuja; nunca tira de ella ni empuja dos cajas.
- Cinco niveles diseñados (1 a 4 cajas, de 2 a 55 movimientos óptimos), definidos como mapas de texto en `levels.ts` con su `par` (movimientos óptimos calculados por BFS).
- Nivel completado cuando todas las cajas están sobre marcas; pausa breve de 0,8 s con banner en el canvas y paso al siguiente nivel; al completar el 5 termina la partida (victoria).
- Deshacer ilimitado (pila de movimientos, restaura operario, caja empujada, movimientos y empujes) y reinicio del nivel actual.
- Repetición de teclas mantenidas gestionada por el motor (primera repetición a los 220 ms, luego cada 110 ms), válida también para el mando táctil.
- Puntuación por nivel con bonus de eficiencia sobre el par y penalizaciones por deshacer y reiniciar.
- HUD propio del canvas: NIVEL, MOVIMIENTOS, CAJAS (colocadas/total) y PUNTOS. Dibujo con primitivas de canvas (sin assets externos) y capa estática cacheada con `createLayerCache` (muros, suelo y marcas).
- Entrada `sokoban` en `lib/game-registry.ts` (576×480, `aria` "Sokoban", sin opciones, adaptador con `hud` Nivel, Movimientos y Cajas, y `touchControls`).
- Fila `sokoban` en `games` por migración `0014_seed_sokoban.sql`; portada `.cover-sokoban`.
- HUD de plataforma: Jugador, Puntuación, Nivel, Movimientos y Cajas.
- Pausa por botón y por `Esc`/`P`, FIN, fin de partida, "JUGAR DE NUEVO", guardado con `submitScore` (solo con sesión, SPEC 18).
- Añadir las specs a `CLAUDE.md`, `README.md` y `references/implemented-games.md` en el mismo cambio de implementación.

**Fuera de alcance (specs futuras):**

- Animación de deslizamiento, sonido, partículas y transiciones (spec `02-sokoban-animacion-sonido.md`).
- Skins (las aplicará el flujo posterior de `skin-designer`), selector de nivel inicial, editor de niveles, niveles generados.
- Detección de deadlocks (aviso de caja atascada), pista o solución automática.
- Récords locales en `localStorage`, guardado de progreso entre partidas.
- Controles táctiles de gestos sobre el canvas (el mando D-pad + 2 acciones sí entra), Supabase Auth, cambios de esquema en `games`/`scores`, anti-trampa, otros juegos, tests automatizados.

## Modelo de datos

```ts
// lib/sokoban/types.ts
export type SokobanStatus = "playing" | "paused" | "gameover";
export type Dir = "up" | "down" | "left" | "right";

export interface SokobanSnapshot {
  score: number;
  level: number; // 1..5
  moves: number; // movimientos del nivel actual (un empuje cuenta 1)
  boxesDone: number; // cajas sobre marcas
  boxesTotal: number;
  status: SokobanStatus;
}

export interface SokobanCallbacks {
  onState(s: SokobanSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface SokobanGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, nivel 1
  end(): void; // termina con la puntuación actual
  destroy(): void;
}

export function createSokobanGame(
  canvas: HTMLCanvasElement,
  callbacks: SokobanCallbacks,
): SokobanGame;

// lib/sokoban/levels.ts
export interface LevelDef {
  name: string; // "ALMACÉN 1"…
  rows: string[]; // mapa de texto, ver leyenda
  par: number; // movimientos óptimos (BFS)
}
export const LEVELS: LevelDef[]; // 5 niveles
```

```sql
-- supabase/migrations/0014_seed_sokoban.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
-- cyan = CATEGORY_COLOR['PUZZLE'] (SPEC 15), no se elige
values (
  'sokoban',
  'SOKOBAN',
  'Empuja las cajas a sus marcas sin atascarte.',
  'Guía al operario por el almacén y empuja cada caja hasta su marca: solo puedes empujar, nunca tirar, así que piensa antes de moverte. Si te atascas, deshaz tus pasos con Z o reinicia el nivel, y completa los cinco niveles con el menor número de movimientos.',
  'PUZZLE',
  'cover-sokoban',
  'cyan',
  6
);
```

Estructura de archivos nueva:

```
lib/sokoban/constants.ts   // CELL, COLS, ROWS, HUD_H, W, H, tiempos de repetición, puntuación
lib/sokoban/types.ts
lib/sokoban/utils.ts       // parseLevel, tryMove, undoMove, isSolved, levelScore, boardOffset
lib/sokoban/levels.ts      // LEVELS (5 mapas con par)
lib/sokoban/engine.ts      // createSokobanGame
supabase/migrations/0014_seed_sokoban.sql
```

Leyenda de los mapas de texto (`LevelDef.rows`): `#` muro, espacio suelo, `.` marca, `$` caja, `*` caja sobre marca, `@` operario, `+` operario sobre marca. Todas las filas de un nivel miden lo mismo y el nivel está cerrado por muros.

Niveles (diseño nuevo; `par` = movimientos óptimos comprobados por BFS):

```
Nivel 1 · ALMACÉN 1 · par 2 · 7×5       Nivel 2 · ALMACÉN 2 · par 9 · 9×7
#######                                 #########
#     #                                 #   #   #
# @$ .#                                 # . $ @ #
#     #                                 #   #   #
#######                                 # . $   #
                                        #   #   #
                                        #########

Nivel 3 · ALMACÉN 3 · par 26 · 11×8     Nivel 4 · ALMACÉN 4 · par 46 · 10×7
###########                             ##########
#    #    #                             #   #    #
# .  #  . #                             # $ #  . #
#  $ $    #                             #   $ #  #
#    @ $  #                             # @  $ . #
#  #   #  #                             #   #  . #
# .      ##                             ##########
###########

Nivel 5 · ALMACÉN 5 · par 55 · 12×8
############
#  #       #
#  #    .  #
# $@ #$ #. #
#   $#  .  #
#  .   $   #
#  #  #  # #
############
```

Convenciones del juego (valores de diseño nuevo, decididos aquí):

- Coordenadas de celda `(col, fila)` con origen arriba-izquierda. Constantes: `CELL = 48`, `COLS = 12`, `ROWS = 9`, `HUD_H = 48`, `W = 576`, `H = 480` (= `HUD_H + ROWS × CELL`). Un nivel de `w × h` celdas se dibuja con desplazamiento `ox = floor((COLS − w) / 2)`, `oy = floor((ROWS − h) / 2)`; `x = (ox + col) × 48`, `y = 48 + (oy + fila) × 48`.
- Movimiento: una pulsación de dirección = un intento de paso. Si la celda destino es muro, o es caja y la siguiente es muro o caja, no ocurre nada (ni se cuenta movimiento). En otro caso el operario avanza, `moves += 1` y, si empujó, `pushes += 1`.
- Pila de deshacer: cada paso válido apila `{ dir, pushed }`. `undo` saca el último, devuelve al operario a su celda y, si empujó, la caja vuelve a su celda anterior; `moves` y `pushes` se restauran (restan 1). Sin movimientos que deshacer no hace nada. `undos += 1` por cada deshacer efectivo.
- Reinicio de nivel (`KeyR`, pulsación única): restaura el mapa original, vacía la pila, `moves = 0`, `pushes = 0`, `resets += 1`; no afecta a `undos`. La partida (`restart()`) reinicia todo a nivel 1.
- Repetición de teclas: el motor guarda la tecla mantenida (`held`) con su instante de pulsación. La primera pulsación actúa de inmediato (se ignora `event.repeat` del navegador); si la tecla sigue pulsada, repite tras `REPEAT_DELAY = 220` ms y luego cada `REPEAT_INTERVAL = 110` ms. Se aplica a movimiento y a deshacer; `R`, `P` y `Esc` no repiten. Si hay varias direcciones mantenidas, manda la última pulsada. Esto es necesario porque el mando táctil emite un solo `keydown` al pulsar y un `keyup` al soltar.
- Nivel completado: tras el paso que deja todas las cajas sobre marcas, el estado interno pasa a `clear` durante 0,8 s (entrada ignorada, banner "NIVEL N COMPLETADO +puntos" en el canvas) y después carga el nivel siguiente. Tras el nivel 5 se suma el bonus de victoria y se emite `onState` con `status: "gameover"` y luego `onGameOver(score)`.
- Puntuación por nivel: `BASE = 500 + 100 × (nivel − 1)`; `bonus = 5 × max(0, 2 × par − moves)`; `penalización = 20 × undos + 100 × resets`; `puntosNivel = max(100, BASE + bonus − penalización)`. Bonus de victoria: `+1000` al completar el nivel 5. Máximo teórico ≈ 5.200 puntos, muy por debajo del tope de 1.000.000 de la BD; `GamePlayer` ya acota al guardar.
- `moves`, `undos` y `resets` se cuentan por nivel y se reinician al cargar cada nivel.
- Teclas (`event.code`): `ArrowUp/KeyW`, `ArrowDown/KeyS`, `ArrowLeft/KeyA`, `ArrowRight/KeyD` mueven; `KeyZ`, `KeyU` y `Backspace` deshacen; `KeyR` reinicia el nivel; `Escape`/`KeyP` pausan (pulsación única, solo desde `playing`). Se lee `e.code`, no `e.key`, y no se filtra `isTrusted` (el mando táctil emite teclas sintéticas).
- `preventDefault` sobre flechas, `W/A/S/D`, `Backspace` y `Space` (también en `keyup` de `Space`, para que un botón con foco no se active) mientras el juego está montado. Los eventos con `target` de tipo `input`, `textarea` o `select` se ignoran.
- Vaciar `held` al pausar, terminar, reiniciar y en `blur` de la ventana. Las teclas pulsadas durante la pausa o el banner de nivel no actúan; al reanudar, `held` está vacío.
- Bucle `requestAnimationFrame` con `dt` máximo 0,05 s (solo para el temporizador de repetición y el banner); `lastTime` reiniciado en `resume()`.
- Dibujo (primitivas, estética neón cian sobre fondo oscuro): suelo con rejilla tenue, muros como bloques con relieve, marcas como anillos cian, cajas como cajones ámbar con aspa (más brillantes y con borde cian si están sobre marca), operario como casco redondeado con visera orientada a la última dirección. Muros, suelo y marcas van en la capa estática de `createLayerCache` (clave: índice de nivel); cajas, operario, HUD y banner se pintan cada frame. Sin `shadowBlur` por objeto (SPEC 14). El canvas no dibuja texto de pausa ni de fin de partida.
- `GameStatus` no cambia: el estado `clear` es interno del motor y el snapshot sigue siendo `playing` durante el banner.
- Orden de eventos al terminar: `onState({ status: "gameover" })` y luego `onGameOver(score)`, una sola vez; `end()` desde cualquier estado pasa por el mismo camino.

## Plan de implementación

1. **Lectura previa, constantes y tipos.**
   - Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs (AGENTS.md); revisar `components/game-player.tsx`, `components/game-canvas.tsx`, `components/touch-controls.tsx`, `lib/game-registry.ts` y `lib/arkanoid/levels.ts` como patrón.
   - Crear `lib/sokoban/constants.ts` (`CELL`, `COLS`, `ROWS`, `HUD_H`, `W`, `H`, `REPEAT_DELAY`, `REPEAT_INTERVAL`, `CLEAR_TIME`, `VICTORY_BONUS`, `UNDO_PENALTY`, `RESET_PENALTY`, `MIN_LEVEL_SCORE`) y `lib/sokoban/types.ts`.
   - Verificación: `npx tsc --noEmit`.
2. **Niveles.**
   - Crear `lib/sokoban/levels.ts` con `LEVELS` (los cinco mapas y su `par` de esta spec, `name` "ALMACÉN 1…5").
   - Verificación: `npx tsc --noEmit`; en cada nivel todas las filas miden lo mismo, hay tantas cajas como marcas y exactamente un operario.
3. **Lógica pura.**
   - Crear `lib/sokoban/utils.ts`: `parseLevel(rows)` (muros, marcas, cajas, operario, tamaño), `tryMove(state, dir)` (devuelve si se movió y si empujó), `undoMove(state)`, `isSolved(state)`, `levelScore(level, par, moves, undos, resets)` y `boardOffset(w, h)`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; sin acceso a `window`/`document`.
4. **Motor: estado, reglas e input.**
   - Crear `lib/sokoban/engine.ts`: estado del nivel, pila de deshacer, reinicio de nivel, repetición de teclas con `held`, puntuación, transición de nivel con fase `clear`, victoria tras el nivel 5, snapshot solo ante cambios y `onGameOver` único.
   - Listeners en `window` (`keydown`, `keyup`, `blur`) registrados en `start()` con cleanup completo en `destroy()` y bandera `destroyed` ante StrictMode.
   - Verificación: `npx tsc --noEmit` y `npm run lint`.
5. **Dibujo.**
   - Añadir a `engine.ts` el `draw`: HUD del canvas (NIVEL, MOVIMIENTOS, CAJAS, PUNTOS), capa estática cacheada con `createLayerCache` (limpiar en `destroy()`), cajas, operario y banner de nivel completado.
   - Verificación: render manual con el reproductor tras el paso 6; los 5 niveles caben en el tablero sin recortes.
6. **Registro del juego.**
   - Registrar `sokoban` en `lib/game-registry.ts`: `width`/`height` desde `lib/sokoban/constants.ts`, `aria` "Sokoban", sin `options`, adaptador `sokobanSnapshot` con `hud` `level` (Nivel, `padStart(2, "0")`), `moves` (Movimientos) y `boxes` (Cajas, `"2/3"`), y `touchControls` con `dpad` de las cuatro flechas y `actions` `[{ code: "KeyZ", label: "DESHACER" }, { code: "KeyR", label: "REINICIAR" }]`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; los demás juegos no cambian; `/juegos/sokoban/jugar` devuelve 404 hasta que el paso 7 inserte la fila.
7. **Migración seed.**
   - Crear `supabase/migrations/0014_seed_sokoban.sql` con la fila de esta spec y aplicarla con `apply_migration`; regenerar `lib/supabase/database.types.ts` si hace falta. Comprobar antes `list_migrations` y `select sort_order from games`; usar el siguiente libre si 6 o `0014` están ocupados y reflejarlo aquí.
   - Verificación: `list_migrations`, `select id, cat, color from games` muestra `sokoban`, `PUZZLE`, `cyan`, `get_advisors` (security) sin avisos críticos y `/juegos/sokoban/jugar` monta el canvas.
8. **Portada y CSS.**
   - Añadir `.cover-sokoban` y su `::after` SVG en `app/globals.css` (aplicar `/frontend-design`): cuadrícula oscura, cajones ámbar con una marca cian y un operario, distinguible de `.cover-tetris` (también cian).
   - Comprobar el escalado del canvas 576×480 a 375 px.
   - Verificación: tarjeta con botón JUGAR cian en `/juegos`, `/juegos/sokoban` con portada y sin desbordar a 375 px.
9. **Verificación en navegador y documentación.**
   - Con Playwright: jugar el nivel 1, deshacer, reiniciar, pausar, completar y, con sesión, guardar una puntuación de prueba; borrar las filas de prueba de `scores` con `execute_sql`.
   - Añadir las specs de Sokoban a `CLAUDE.md` y `README.md` y la fila a `references/implemented-games.md`.
   - Verificación: ambos documentos mencionan `01-sokoban-core.md`; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `sokoban-01: Paso N`. Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` según `AGENTS.md`. Para el diseño visual (portada, estados) aplicar `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

**Genéricos:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `supabase/migrations/0014_seed_sokoban.sql` existe y figura en `list_migrations`; `games` contiene `sokoban` (PUZZLE, `cover-sokoban`, cyan, `sort_order` 6 o el siguiente libre) y `get_advisors` (security) no reporta avisos críticos.
- [ ] `/juegos` muestra la tarjeta SOKOBAN con su portada y el botón JUGAR en cian; `/juegos/sokoban` carga y "JUGAR AHORA" lleva a `/juegos/sokoban/jugar`.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings.
- [ ] Las flechas, `W/A/S/D`, `Backspace` y `Espacio` no hacen scroll ni navegan mientras Sokoban está montado.
- [ ] `PAUSA`/`REANUDAR` congela y continúa; `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en fin de partida no tienen efecto; el canvas no dibuja texto de pausa; el overlay "EN PAUSA" muestra la pista de teclas.
- [ ] Durante la pausa las teclas de movimiento, deshacer y reinicio no actúan, y al reanudar no se repite ningún movimiento.
- [ ] `Espacio` con el foco en PAUSA/FIN no activa el botón.
- [ ] Completar el nivel 5 y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] "JUGAR DE NUEVO" reinicia a puntuación 0, nivel 1 y 0 movimientos, sin teclas pegadas.
- [ ] Con sesión iniciada, guardar inserta una fila con `game_id = 'sokoban'` y se muestra "PUNTUACIÓN GUARDADA_"; sin sesión se muestra "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" y no se inserta nada (SPEC 18).
- [ ] La puntuación aparece en la ficha, en el Salón (tab SOKOBAN) y en la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [ ] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos (las flechas vuelven a hacer scroll).
- [ ] En desarrollo (StrictMode) hay una sola instancia y un solo conjunto de listeners.
- [ ] A 375 px el canvas se escala sin desbordar; con `pointer: coarse` aparece el mando con las 4 direcciones y los botones DESHACER y REINICIAR, y soltar el dedo no deja teclas pegadas.
- [ ] Asteroids, Tetris, Arkanoid, Snake y Frogger siguen funcionando igual.
- [ ] `references/started-games/` no ha cambiado y no se escribe `localStorage`.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Sokoban:**

- [ ] Al iniciar, el canvas muestra el nivel 1 centrado en el tablero, el HUD del canvas con NIVEL 1, MOVIMIENTOS 0, CAJAS 0/1 y PUNTOS 0, y el HUD de plataforma muestra Jugador, Puntuación 0, Nivel 01, Movimientos 0 y Cajas 0/1.
- [ ] Una pulsación de dirección mueve al operario exactamente una celda; contra un muro no se mueve ni suma movimiento.
- [ ] El operario empuja una caja si la celda siguiente está libre; con muro o con otra caja detrás no se mueve ni suma movimiento; nunca tira de una caja.
- [ ] Cada paso válido suma 1 a MOVIMIENTOS (los empujes también); "CAJAS" refleja las cajas sobre marcas en tiempo real.
- [ ] Mantener pulsada una dirección repite el paso tras 220 ms y luego cada 110 ms, y deja de repetir al soltar o al perder el foco de la ventana.
- [ ] `Z`, `U` y `Backspace` deshacen el último paso (operario, caja empujada, MOVIMIENTOS y empujes); se pueden deshacer todos los pasos del nivel hasta el estado inicial y deshacer sin historial no hace nada.
- [ ] `R` reinicia el nivel actual sin cambiar el nivel ni la puntuación acumulada; mantener `R` no reinicia varias veces.
- [ ] Colocar la última caja sobre una marca muestra el banner durante 0,8 s, ignora la entrada en ese lapso y carga el nivel siguiente con MOVIMIENTOS 0.
- [ ] Los 5 niveles tienen tantas cajas como marcas y son resolubles; resolver el nivel 1 con 2 movimientos suma `500 + 5 × (4 − 2) = 510`.
- [ ] Cada deshacer efectivo resta 20 y cada reinicio de nivel resta 100 a la puntuación de ese nivel, con un mínimo de 100 por nivel.
- [ ] Completar el nivel 5 suma 1000 de bonus, emite `status: "gameover"` y después `onGameOver(score)` una sola vez.
- [ ] FIN en cualquier momento cierra la partida con la puntuación acumulada (sin sumar el nivel en curso).
- [ ] Los muros, el suelo y las marcas no se repintan cada frame (capa estática cacheada) y el juego mantiene fluidez con CPU ×6.
- [ ] `restart()` deja 0 puntos, nivel 1, pila de deshacer vacía y sin teclas pegadas.
- [ ] `destroy()` cancela el rAF, limpia la capa cacheada y quita todos los listeners.

## Decisiones

- **Sí:** diseño nuevo y original: mecánica clásica de empujar cajas, sin copiar arte, nombres ni mapas de un título o colección concretos. Los cinco mapas se verificaron con BFS (solubilidad y `par`).
- **Sí:** sin vidas. Razón: es un puzle por turnos sin peligros ni reflejos; equivocarse no mata, se corrige con deshacer o reiniciando. Un contador de vidas no tendría qué restar. La partida termina al completar los 5 niveles o con FIN. Si en el futuro hay un límite de movimientos, se decidirá en otra spec.
- **Sí:** deshacer ilimitado con penalización de 20 puntos por uso y reinicio de nivel con 100. Razón: deshacer es la seña de identidad del tema, pero sin coste el leaderboard premiaría el ensayo y error; la penalización conserva la elección y premia resolver con previsión. El mínimo de 100 por nivel evita puntuaciones negativas.
- **Sí:** bonus de eficiencia `5 × max(0, 2 × par − moves)`. Razón: premia acercarse al óptimo sin exigirlo; `par` es el mínimo exacto de movimientos, así que el bonus siempre es alcanzable.
- **Sí:** puntuación por nivel y bonus de victoria de 1000. Razón: totales pequeños y legibles (máximo ≈ 5.200, lejos del tope de 1.000.000).
- **Sí:** HUD doble explícito: HUD dibujado en el canvas (NIVEL, MOVIMIENTOS, CAJAS, PUNTOS) y HUD de plataforma de `GamePlayer` (Jugador, Puntuación + `snapshot.hud`: Nivel, Movimientos, Cajas). Razón: coherencia con Tetris, Arkanoid, Snake y Frogger y legibilidad con el canvas escalado.
- **Sí:** repetición de teclas dentro del motor con `held` y temporizador, en lugar de confiar en `event.repeat`. Razón: el mando táctil emite un solo `keydown` por pulsación; así mantener el D-pad también repite y el comportamiento es idéntico en teclado y móvil. Se ignora `event.repeat` para no duplicar pasos.
- **Sí:** mando táctil con D-pad de 4 direcciones y 2 acciones (`DESHACER` → `KeyZ`, `REINICIAR` → `KeyR`). Razón: es lo mínimo para jugar el puzle en móvil (SPEC 12/13); el motor no filtra `isTrusted`.
- **Sí:** `Backspace`, `Z` y `U` para deshacer. Razón: `Z` es el estándar de la tecla, `U` es el mnemónico "undo" y `Backspace` es natural; los tres se capturan con `preventDefault`.
- **Sí:** tablero lógico de 12×9 y niveles centrados. Razón: los 5 mapas caben (el mayor mide 12×8) y el canvas queda fijo en 576×480, escalable por CSS como los demás juegos.
- **Sí:** capa estática con `createLayerCache` y sin `shadowBlur` por objeto. Razón: SPEC 14 exige ≥58 FPS con CPU ×6; muros y suelo no cambian.
- **Sí:** banner de nivel completado dibujado en el canvas durante 0,8 s. Razón: es una transición breve y propia del juego, no un overlay de pausa ni de game over (esos los pinta `GamePlayer`).
- **Sí:** `cat` PUZZLE y `color` cyan, derivado con `CATEGORY_COLOR` (SPEC 15); `sort_order` 6 y migración `0014`, siguientes libres.
- **Sí:** el fin de partida por victoria se notifica por `onGameOver`; el contrato no distingue victoria (como en SPEC 08 y 09).
- **No:** deadlock detection, pistas o solución automática. Razón: alcance acotado; son una mejora de otra spec.
- **No:** animación, sonido y skins en esta spec. Razón: el 02 aporta animación y sonido; las skins las aplica el flujo posterior.
- **No:** `devicePixelRatio`; canvas lógico 576×480 escalado por CSS.
- **No:** niveles generados al azar. Razón: la solubilidad debe garantizarse y verificarse; los mapas son fijos.

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Algún mapa resulta irresoluble al transcribirlo                              | Los mapas de esta spec se verificaron con BFS; en el paso 2 comprobar cajas = marcas y resolver cada nivel jugando antes de continuar. |
| El motor filtra `isTrusted` e ignora el mando táctil                         | No filtrar; leer `e.code`; criterio de aceptación con emulación táctil.                                                                |
| El mando táctil no repite y mantener el D-pad solo da un paso                | Repetición propia con `held` y temporizador; se ignora `event.repeat`.                                                                 |
| Teclas pegadas al pausar, perder foco o terminar                             | Vaciar `held` al pausar, terminar, reiniciar y en `blur`; entrada ignorada en pausa y durante el banner.                               |
| `Backspace` navega hacia atrás o `Espacio` activa un botón enfocado          | `preventDefault` sobre las teclas del juego y en `keyup` de `Espacio`; ignorar `target` `input`/`textarea`/`select`.                   |
| Doble paso por `event.repeat` + temporizador propio                          | Ignorar `event.repeat` y repetir solo desde el bucle.                                                                                  |
| Capa estática desactualizada al cambiar de nivel                             | Clave de `createLayerCache` = índice de nivel; `clear()` en `restart()` y `destroy()`.                                                 |
| StrictMode duplica bucle y listeners                                         | `destroy()` cancela rAF y quita listeners; bandera `destroyed`; criterio de una instancia.                                             |
| `Math.random`, `window` o `document` rompen el render en servidor            | Todo se crea dentro de `createSokobanGame`, llamado solo desde `useEffect`; el juego no usa azar.                                      |
| `0014` o `sort_order` 6 ya ocupados cuando se implemente                     | Comprobar `list_migrations` y `select sort_order from games` en el paso 7; usar el siguiente libre y reflejarlo aquí.                  |
| Portada cian confundible con la de Tetris                                    | Distinguir por composición (cajones ámbar y operario frente a piezas cian) en el paso 8.                                               |
| SPEC 18: un invitado completa la partida y pierde la puntuación              | Comportamiento ya cubierto por `GamePlayer` (aviso y botón a `/login`); no hay lógica de guardado en el motor.                         |

## Qué **no** está en esta spec

- Animación de deslizamiento, sonido, partículas y transiciones (spec 02).
- Skins, selector de nivel inicial, editor o generador de niveles.
- Detección de deadlocks, pistas y solución automática.
- Récords locales en `localStorage` y guardado de progreso.
- Controles táctiles de gestos, Supabase Auth, cambios de esquema en `games`/`scores`, anti-trampa y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propia spec.
