# SPEC whack-a-mole-01 — Whack-a-Mole: motor, registro, migración seed y portada

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 09 (patrón de motor), SPEC 12 (mando táctil), SPEC 15 (color por categoría)
> **Fecha:** 2026-11-20
> **Objetivo:** Crear el juego original `whack-a-mole` (rejilla 3×3 de agujeros, topos que golpear y bombas que esquivar en 60 s, controlado por teclado) como juego real de la plataforma, con motor en `lib/whack-a-mole/`, entrada en `GAME_REGISTRY`, migración seed y portada.

## Por qué existe esta spec

El tema viene de la tabla "Sugeridos" de `references/game-suggestions-todo.md` ("Golpea topos, evita bombas, 60 s. Reflejos por clic. Dif. S."). Es un juego nuevo, sin código original en `references/started-games/`.

La sugerencia original es de **clic de ratón**, pero la plataforma es "REQUIERE TECLADO": los motores escuchan `KeyboardEvent` en `window` y el mando táctil (SPEC 12/13) emite teclas sintéticas. Por eso el control se rediseña para teclado: un cursor sobre la rejilla 3×3 y una tecla de golpe, más atajos numéricos directos. Ese mismo esquema encaja sin cambios con `touchControls` (d-pad + 1 acción).

Mecánica distinta a los juegos ya implementados (Asteroids, Tetris, Arkanoid, Snake, Frogger): partida cronometrada por tiempo, sin vidas, basada en reflejos y reconocimiento de objetivo.

## Ficha del juego

| Campo        | Valor                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `game-id`    | `whack-a-mole`                                                                                       |
| `title`      | `WHACK-A-MOLE`                                                                                       |
| `cat`        | `ARCADE`                                                                                             |
| `color`      | `green` (= `CATEGORY_COLOR['ARCADE']`, SPEC 15)                                                      |
| `cover`      | `cover-whack-a-mole`                                                                                 |
| `sort_order` | `6` (los seeds existentes llegan hasta Frogger = 5)                                                  |
| Migración    | `0013_seed_whack_a_mole.sql` (la última existente es `0012_seguridad.sql`)                           |
| Canvas       | 600×640 (franja HUD de 40 px + tablero 3×3 de celdas de 200 px = 600×600)                            |
| Controles    | Flechas o `W/A/S/D` mueven el cursor; `Espacio`/`Enter` golpean; `1`-`9` golpean un agujero directo  |
| Derrota/fin  | Se acaba el tiempo (60 s). No hay victoria: se compite por puntos                                    |

## Alcance

**Dentro:**

- Motor en `lib/whack-a-mole/` (`constants.ts`, `utils.ts`, `types.ts`, `entities.ts`, `engine.ts`) con `createWhackAMoleGame`, sin globales, DOM ni `localStorage` fuera de la factoría.
- Rejilla 3×3 de agujeros; en cada agujero puede asomar un topo o una bomba durante un tiempo limitado.
- Cursor de teclado (flechas/`W/A/S/D`), golpe con `Espacio`/`Enter` y golpe directo con `Digit1`-`Digit9` (y `Numpad1`-`Numpad9`) según la disposición de un teclado numérico.
- Temporizador de 60 s; dificultad creciente con el tiempo transcurrido.
- Puntuación: topo +10; bomba −50 puntos (mínimo 0) y −3 s de tiempo.
- HUD propio del canvas: PUNTOS, TIEMPO y ACIERTOS; barra de tiempo.
- Fila `whack-a-mole` en `games` por migración `0013`; portada `.cover-whack-a-mole`.
- Entrada en `GAME_REGISTRY` (600×640, sin opciones) con adaptador `whackAMoleSnapshot` y `touchControls`.
- HUD de plataforma: Jugador, Puntuación, Tiempo y Aciertos.
- Pausa por botón y por `Esc`/`P`, FIN, game over, "JUGAR DE NUEVO", guardado con `submitScore`.
- Añadir las specs a `CLAUDE.md`, `README.md` y `references/implemented-games.md` al implementar.

**Fuera de alcance (specs futuras):**

- Topos especiales, combos, rachas y animaciones de puntos flotantes (spec `02-whack-a-mole-specials-combos`).
- Skins, sonido y música, sprites externos, selector de dificultad.
- Control por ratón o gestos sobre el canvas, controles táctiles propios (solo el mando genérico), Supabase Auth, cambios de esquema en `games`/`scores`, tests automatizados.

## Modelo de datos

```ts
// lib/whack-a-mole/types.ts
export type WhackStatus = "playing" | "paused" | "gameover";

export interface WhackSnapshot {
  score: number;
  timeLeft: number; // segundos enteros restantes, 60..0
  hits: number; // topos golpeados
  status: WhackStatus;
}

export interface WhackCallbacks {
  onState(s: WhackSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface WhackGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, 60 s, cursor al centro
  end(): void; // fuerza game over con la puntuación actual
  destroy(): void;
}

export function createWhackAMoleGame(
  canvas: HTMLCanvasElement,
  callbacks: WhackCallbacks,
): WhackGame;

// lib/whack-a-mole/entities.ts
export type PopKind = "mole" | "bomb";
export interface Pop {
  hole: number; // 0..8, fila-mayor (0 = arriba-izquierda)
  kind: PopKind;
  age: number; // ms desde que asoma
  life: number; // ms totales que permanece asomado
  hit: boolean; // golpeado: animación de caída, ya no puntúa
}
```

```sql
-- supabase/migrations/0013_seed_whack_a_mole.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'whack-a-mole',
  'WHACK-A-MOLE',
  'Golpea topos y esquiva bombas antes de que acabe el tiempo.',
  'Mueve el mazo por la rejilla y golpea los topos que asoman de sus agujeros, pero cuidado con las bombas: te quitan puntos y segundos. Tienes 60 segundos y cada vez salen más rápido.',
  'ARCADE',
  'cover-whack-a-mole',
  'green',
  6
);
```

```
// Estructura de archivos nueva
lib/whack-a-mole/constants.ts   // W, H, HUD_H, COLS, ROWS, CELL, ROUND_SECONDS, puntos, dificultad
lib/whack-a-mole/utils.ts       // holeAt, moveCursor, upTime, spawnInterval, bombChance, maxActive, digitToHole
lib/whack-a-mole/types.ts
lib/whack-a-mole/entities.ts    // Pop, spawn, update de pops
lib/whack-a-mole/engine.ts      // createWhackAMoleGame
supabase/migrations/0013_seed_whack_a_mole.sql
```

Convenciones del juego (valores de diseño nuevos decididos aquí):

- Canvas 600×640 (`W = 600`, `H = 640`, `HUD_H = 40`). Agujero `i` (0..8): `col = i % 3`, `fila = floor(i / 3)`; celda de 200 px con origen `x = col × 200`, `y = 40 + fila × 200`.
- Cursor: celda `(col, fila)` inicial `(1,1)` (agujero 4). Flechas y `W/A/S/D` lo mueven una celda por pulsación (sin repetición con `event.repeat`); en los bordes **no** da la vuelta (se ignora).
- Golpe: `Space`/`Enter` golpea el agujero del cursor; `Digit1`-`Digit9`/`Numpad1`-`Numpad9` golpean directamente el agujero con la disposición del teclado numérico (7 8 9 arriba, 4 5 6 medio, 1 2 3 abajo) y además mueven el cursor a él. Sin `event.repeat`.
- Cadencia de golpe: tras golpear hay un enfriamiento de 150 ms (animación del mazo) en el que se ignoran nuevos golpes. Golpear un agujero vacío no penaliza pero consume el enfriamiento.
- Resolución del golpe: si el agujero tiene un `Pop` asomado (`age` < `life`, no `hit`): topo → `+10`, `hits += 1`; bomba → `score = max(0, score − 50)` y `timeLeft −= 3 s` (mínimo 0, sin pasar de 0 a negativo). El `Pop` golpeado pasa a `hit = true` y desaparece con una animación de 200 ms.
- Tiempo: `ROUND_SECONDS = 60`, descuenta con `dt` real (limitado a 0,05 s, `lastTime` reiniciado en `resume()`). Al llegar a 0: snapshot con `timeLeft: 0, status: "gameover"` y luego `onGameOver(score)`.
- Dificultad según `elapsed` (segundos transcurridos desde el inicio, sin contar pausa ni penalizaciones de bomba):
  - `upTime(elapsed) = max(450, 1100 − elapsed × 10)` ms que permanece asomado.
  - `spawnInterval(elapsed) = max(350, 900 − elapsed × 8)` ms entre intentos de aparición.
  - `maxActive(elapsed) = 1 + floor(elapsed / 20)` agujeros simultáneos (1, 2 y 3 como máximo).
  - `bombChance(elapsed) = min(0.3, 0.12 + elapsed × 0.003)`.
  - Cada intento elige un agujero libre al azar (y topo o bomba según `bombChance`) solo si `activos < maxActive`.
  - `Math.random` solo se llama dentro de `createWhackAMoleGame` (invocado desde `useEffect`).
- Animación de asomar/ocultar: el sprite sube durante los primeros 120 ms y baja los últimos 120 ms de `life`; solo es golpeable mientras `age` esté entre 60 ms y `life − 60 ms` (margen de cortesía para el reflejo).
- Sprites con primitivas de canvas (sin assets): agujero como elipse oscura, topo marrón con ojos y nariz rosa, bomba negra con mecha y chispa, mazo sobre el cursor, marco de cursor neón.
- HUD del canvas: PUNTOS, TIEMPO (segundos) y ACIERTOS; barra de tiempo que pasa de verde a rojo en los últimos 10 s. El canvas **no** dibuja texto de pausa ni "GAME OVER".
- Puntuación entera 0..~3.000 (máximo teórico muy inferior al CHECK de 1.000.000 de `scores`).
- Teclas (`event.code`): `ArrowUp/KeyW`, `ArrowDown/KeyS`, `ArrowLeft/KeyA`, `ArrowRight/KeyD`, `Space/Enter`, `Digit1-9`, `Numpad1-9`; pausa `Escape/KeyP` (pulsación única, solo desde `playing`). `preventDefault` sobre flechas, `W/A/S/D`, `Space` y `Enter` mientras está montado, también en `keyup` de `Space`. Se ignoran eventos con `target` `input/textarea/select`. Se vacía la entrada en pausa, fin, reinicio y `blur`. No se filtra `e.isTrusted`.

Registro (`lib/game-registry.ts`):

- Adaptador `whackAMoleSnapshot(s)` → `{ score, status, hud: [{ key: "time", label: "Tiempo", value: \`${s.timeLeft} s\` }, { key: "hits", label: "Aciertos", value: String(s.hits) }] }`.
- `width: 600`, `height: 640`, `aria: "Whack-a-Mole"`, sin `options`.
- `touchControls`: `dpad: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }`, `actions: [{ code: "Space", label: "GOLPEAR" }]`. Los atajos numéricos son solo de teclado físico.

## Plan de implementación

1. **Lectura previa, constantes, utilidades y tipos.**
   - Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs (AGENTS.md); revisar `components/game-player.tsx`, `components/game-canvas.tsx`, `lib/game-registry.ts`, `lib/snake/engine.ts` y `lib/frogger/engine.ts` como patrón.
   - Crear `lib/whack-a-mole/constants.ts`, `utils.ts` (`holeAt`, `moveCursor`, `digitToHole`, `upTime`, `spawnInterval`, `maxActive`, `bombChance`) y `types.ts`.
   - Verificación: `npx tsc --noEmit`.
2. **Entidades.**
   - Crear `lib/whack-a-mole/entities.ts`: `Pop`, creación en un agujero libre, avance de `age`, caducidad y marca de golpeado.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; nunca hay dos `Pop` en el mismo agujero.
3. **Motor.**
   - Crear `lib/whack-a-mole/engine.ts`: estado (cursor, pops, enfriamiento, tiempo, puntos), bucle rAF con `dt` ≤ 0,05 s, aparición según dificultad, resolución de golpes, penalización de bomba, temporizador, snapshot solo ante cambios (entero de `timeLeft`, `score`, `hits`, `status`) y `onGameOver` único tras emitir `timeLeft: 0`.
   - Input en `window` con `preventDefault` selectivo, pausa `Esc`/`P`, vaciado en `blur`, y `pause/resume/restart/end/destroy` con cleanup completo y bandera `destroyed` ante StrictMode.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; una sola instancia en desarrollo.
4. **Dibujo.**
   - Implementar `draw` en `engine.ts`: fondo con césped, 9 agujeros, topos y bombas con su animación, cursor con mazo, HUD (PUNTOS, TIEMPO, ACIERTOS) y barra de tiempo. Usar `lib/canvas-cache.ts` (`createLayerCache`) para el fondo y los agujeros estáticos, limpiándolo en `destroy`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; render visible en `/juegos/whack-a-mole/jugar` tras el paso 6.
5. **Registro del juego.**
   - Añadir `whack-a-mole` a `lib/game-registry.ts` (importar `createWhackAMoleGame`, `W`/`H`, tipo `WhackSnapshot`), con `whackAMoleSnapshot` y `touchControls`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; los demás juegos no cambian; `/juegos/whack-a-mole/jugar` devuelve 404 hasta aplicar la migración del paso 6.
6. **Migración seed.**
   - Comprobar con `list_migrations` y `select sort_order from games` que `0013` y `sort_order` 6 están libres (si no, usar el siguiente y reflejarlo aquí); crear `supabase/migrations/0013_seed_whack_a_mole.sql` con el SQL del modelo de datos, aplicarla con `apply_migration` y regenerar `lib/supabase/database.types.ts` solo si cambia.
   - Verificación: `list_migrations`, `select id, cat, color from games` muestra `whack-a-mole`, `ARCADE`, `green`; `get_advisors` (security) sin avisos críticos; `/juegos/whack-a-mole/jugar` monta el canvas.
7. **Portada y CSS.**
   - Añadir `.cover-whack-a-mole` y el escalado del canvas 600×640 en `app/globals.css` (aplicar `/frontend-design`: topo asomando de un agujero con mazo sobre césped verde, distinguible de las demás portadas).
   - Verificación: tarjeta con portada en `/juegos`, ficha `/juegos/whack-a-mole` y sin desbordar a 375 px.
8. **Verificación en navegador y documentación.**
   - Probar con Playwright MCP (jugar una ronda completa, golpear topo y bomba, pausar, guardar "TEST", ver leaderboard), borrar las filas de prueba de `scores` con `execute_sql`, y añadir las specs a `CLAUDE.md`, `README.md` y `references/implemented-games.md`.
   - Verificación: ambos documentos mencionan `specs/game-jam/whack-a-mole/`; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `whack-a-mole-01: Paso N`. Para el diseño visual (portada, estados) aplicar `/frontend-design`.

## Criterios de aceptación

**Genéricos:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `supabase/migrations/0013_seed_whack_a_mole.sql` existe y figura en `list_migrations`; `games` contiene `whack-a-mole` (ARCADE, `cover-whack-a-mole`, green, `sort_order` 6 o el siguiente libre) y `get_advisors` (security) no reporta avisos críticos.
- [ ] `/juegos` muestra la tarjeta con su portada y el botón JUGAR en verde (color de ARCADE); `/juegos/whack-a-mole` carga y "JUGAR AHORA" lleva a `/juegos/whack-a-mole/jugar`.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings.
- [ ] Flechas, `W/A/S/D`, `Espacio` y `Enter` no hacen scroll ni activan botones con foco mientras el juego está montado.
- [ ] PAUSA/REANUDAR congela y continúa; `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en game over no tienen efecto; el canvas no dibuja texto de pausa; el overlay "EN PAUSA" muestra la pista de teclas.
- [ ] Durante la pausa los golpes y movimientos de cursor no actúan, y al reanudar no hay salto de tiempo.
- [ ] Acabarse el tiempo y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] "JUGAR DE NUEVO" reinicia a 0 puntos, 60 s, 0 aciertos y cursor al centro, sin teclas pegadas.
- [ ] Guardar con nombre "TEST" inserta una fila con `game_id = 'whack-a-mole'`; nombre vacío guarda `INVITADO`; se muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación aparece en la ficha, el Salón (pestaña del juego) y la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [ ] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos (las flechas vuelven a hacer scroll).
- [ ] En desarrollo (StrictMode) hay una sola instancia y la dificultad avanza a ritmo normal.
- [ ] A 375 px el canvas se escala sin desbordar; el mando táctil solo aparece con `pointer: coarse`, con d-pad completo y un botón "GOLPEAR", y cada botón maneja el juego sin teclas pegadas.
- [ ] Asteroids, Tetris, Arkanoid, Snake y Frogger siguen funcionando igual.
- [ ] `references/started-games/` no ha cambiado y no se escribe `localStorage` desde el motor.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Whack-a-Mole:**

- [ ] Al iniciar, el canvas muestra 9 agujeros, el cursor en el agujero central, el HUD del canvas con PUNTOS 0, TIEMPO 60 y ACIERTOS 0; el HUD de plataforma muestra Jugador, Puntuación 0, Tiempo "60 s" y Aciertos 0.
- [ ] Las flechas y `W/A/S/D` mueven el cursor una celda por pulsación y se ignoran en los bordes; mantener pulsada la tecla no repite.
- [ ] `Digit1`-`Digit9` y `Numpad1`-`Numpad9` golpean el agujero de la posición equivalente del teclado numérico (7 8 9 arriba) y mueven el cursor a él.
- [ ] Golpear un topo asomado suma exactamente 10 puntos y 1 acierto; golpear un agujero vacío no cambia puntos ni tiempo.
- [ ] Golpear una bomba resta 50 puntos sin bajar de 0 y resta 3 s al tiempo restante sin bajar de 0.
- [ ] Tras un golpe hay 150 ms de enfriamiento: un segundo golpe dentro de ese intervalo se ignora.
- [ ] Un topo no golpeado se oculta tras `upTime` sin penalización.
- [ ] Nunca hay dos elementos en el mismo agujero ni más de `maxActive` a la vez (1 antes de 20 s, 2 desde 20 s, 3 desde 40 s).
- [ ] La dificultad sube con el tiempo: `upTime` baja de 1100 ms a 450 ms como mínimo y `bombChance` sube de 0,12 hasta 0,3.
- [ ] El temporizador baja 1 por segundo, se detiene en pausa y, al llegar a 0, se emite `timeLeft: 0` y después `onGameOver(score)` una sola vez.
- [ ] La barra de tiempo se pone roja en los últimos 10 s.

## Decisiones

- **Sí:** diseño original (rejilla 3×3, topos y bombas dibujados con primitivas), sin copiar arte ni reglas de un título concreto.
- **Sí:** control por teclado con cursor + tecla de golpe y atajos numéricos. Razón: la plataforma es "REQUIERE TECLADO" y los motores solo reciben `KeyboardEvent`; el clic de ratón de la sugerencia no se puede portar sin romper el contrato ni el mando táctil.
- **Sí:** cursor sin wrap en los bordes. Razón: movimientos predecibles y verificables.
- **Sí:** atajos `Digit1-9`/`Numpad1-9` como acelerador de teclado físico. Razón: la disposición 3×3 del teclado numérico permite reflejos rápidos que el cursor solo no permite; no están en `touchControls` porque el mando solo admite d-pad + 0-2 acciones.
- **Sí:** `touchControls` con d-pad de 4 direcciones y 1 acción "GOLPEAR" (`Space`). Razón: SPEC 12; cubre el juego completo con cursor.
- **Sí:** **sin vidas**: mecánica clásica de una sola ronda cronometrada de 60 s. Razón: el tiempo es el recurso del juego y la bomba lo castiga con puntos y segundos, así que un contador de vidas sería redundante; por eso el HUD usa `time` y `hits` en lugar de `lives`, y el fin siempre llega por tiempo.
- **Sí:** bomba = −50 puntos (mínimo 0) y −3 s. Razón: penalización doble que obliga a distinguir objetivos sin que un fallo aislado sea irrecuperable.
- **Sí:** golpear un agujero vacío no penaliza, pero consume 150 ms de enfriamiento. Razón: evita el spam de teclas sin castigar al jugador con puntos.
- **Sí:** margen de cortesía de 60 ms al asomar y al ocultarse. Razón: el sprite en movimiento no debe sentirse golpeable antes de verse.
- **Sí:** dificultad según tiempo transcurrido (fórmulas lineales con tope). Razón: curva simple, verificable y sin niveles discretos; los niveles y patrones quedan fuera.
- **Sí:** HUD doble: HUD dibujado en el canvas (PUNTOS, TIEMPO, ACIERTOS) y HUD de plataforma de `GamePlayer` (Jugador, Puntuación + `snapshot.hud` con Tiempo y Aciertos). Razón: coherencia con los demás juegos y legibilidad con el canvas escalado.
- **Sí:** arquitectura real del repo (`lib/<juego>/` + adaptador en `GAME_REGISTRY`), sin componente ni página por juego.
- **Sí:** orden de eventos al terminar: `onState({ timeLeft: 0, status: "gameover" })` y después `onGameOver(score)`.
- **No:** control por ratón/clic. Razón: incompatible con el contrato de teclado y el mando táctil.
- **No:** topos especiales, combos, sonido y skins. Razón: alcance delimitado; los especiales/combos van en la spec 02.
- **No:** `devicePixelRatio`; canvas lógico 600×640 escalado por CSS como los demás juegos.

## Riesgos

| Riesgo                                                            | Mitigación                                                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| StrictMode duplica bucle y listeners                              | `destroy()` cancela rAF y quita listeners; bandera `destroyed`; criterio de una sola instancia.                   |
| `Math.random` rompe el render en servidor                         | Todo se crea dentro de `createWhackAMoleGame`, llamado solo desde `useEffect`; React renderiza el `<canvas>` vacío. |
| Teclas pegadas al pausar o perder foco                            | Vaciar la entrada al pausar, terminar, reiniciar y en `blur`; entrada ignorada en pausa y game over.              |
| `Space`/`Enter` activan un botón con foco o hacen scroll          | `preventDefault` selectivo (también en `keyup` de `Space`); ignorar eventos con `target` `input/textarea/select`. |
| Motor que filtre `isTrusted` ignoraría el mando táctil            | No se filtra `isTrusted`; se lee `e.code`.                                                                        |
| `dt` grande tras cambiar de pestaña                               | `dt` máximo 0,05 s y `lastTime` reiniciado en `resume()`.                                                         |
| Muchos golpes accidentales con dedo táctil sobre "GOLPEAR"        | Enfriamiento de 150 ms y golpe sin penalización en agujero vacío.                                                 |
| Cola de la penalización de bomba lleva el tiempo a negativo       | `timeLeft = max(0, …)` y fin de partida inmediato al llegar a 0.                                                  |
| `sort_order` 6 o migración `0013` ocupados al implementar         | Comprobar con `list_migrations` y `select sort_order from games` en el paso 6; usar el siguiente libre.          |
| Datos de prueba quedan en la BD                                   | Paso 8 borra `scores`; criterio "las filas de prueba están borradas".                                             |

## Qué **no** está en esta spec

- Topos especiales, combos, rachas y puntos flotantes (spec 02).
- Skins, sonido, música, sprites externos y selector de dificultad.
- Control por ratón o gestos sobre el canvas.
- Controles táctiles propios más allá del mando genérico, Supabase Auth, cambios de esquema en `games`/`scores` y anti-trampa.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
