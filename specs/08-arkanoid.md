# SPEC 08 — Arkanoid: tercer juego real con sonido y 5 niveles

> **Estado:** Implementado
> **Depende de:** SPEC 01 (reproductor y modal), SPEC 04 (migraciones de Supabase), SPEC 05 (Asteroids, patrón de motor), SPEC 06 (tablas `games` y `scores`, `submitScore`), SPEC 07 (registro genérico de juegos)
> **Fecha:** 2026-11-16
> **Objetivo:** Portar `references/started-games/claude-arkanoid` a un motor TypeScript sin globales, añadirlo como juego real `arkanoid` (fila en `games`, leaderboard en `scores`) y registrarlo en el registro genérico de juegos.

---

## Por qué existe esta spec

`references/started-games/claude-arkanoid` es un Arkanoid en canvas + JS vanilla (`game.js`, ~515 líneas, más `levels.js` y `assets/spritesheet.js`) que no puede pegarse tal cual en React. Inventario del original:

- **Scripts globales sin módulos:** `LEVELS` (`levels.js:4`), `SPRITES`, `EXPLOSION_FRAMES`, `loadSpritesheet`, `drawFrame`, `drawSprite` (`assets/spritesheet.js:1-66`) y el objeto `game` con todo el estado (`game.js:56-67`), más `lastTime` (`game.js:229`) y `keys` (`game.js:232`).
- **Listeners sin cleanup:** `keydown` y `keyup` en `window` (`game.js:249-273`), `mousedown` y `mousemove` en el canvas (`game.js:272`, `276-281`).
- **IDs del DOM:** `getElementById('game')` (`game.js:41`) y `<canvas id="game" width="480" height="640">` (`index.html:10`). Solo se conserva el canvas.
- **Overlays y menús dibujados en el canvas** que se eliminan: inicio (`game.js:464-468`), pausa con selector de nivel (`game.js:469-485`), game over y victoria con "Espacio o clic para reiniciar" (`game.js:491-497`). El aviso "NIVEL N COMPLETADO" (`game.js:486-490`) y "Espacio o clic para lanzar" (`game.js:498-499`) son indicaciones de partida y se conservan.
- **Selector de nivel de la pausa** (botones y teclas `1`-`5`, `game.js:200-227`, `260-269`): queda fuera (ver Decisiones).
- **`localStorage`:** `arkanoid:v1:highScore` (`game.js:16`, `69-96`). El récord pasa a Supabase.
- **Aleatoriedad y reloj:** `Math.random` en las partículas (`game.js:146-150`) y `performance.now()` en las explosiones (`game.js:291`, `381`, `432`); solo pueden ejecutarse dentro de `useEffect`.
- **Sonido:** dos `Audio` a nivel de módulo (`game.js:44-48`, rutas `assets/sounds/*.mp3`, `game.js:38-39`) clonados al reproducir (`game.js:50-53`). `new Audio` a nivel de módulo rompe el render en servidor.
- **Spritesheet:** `assets/spritesheet-breakout.png` cargado con `new Image()` y copiado a un canvas auxiliar (`assets/spritesheet.js:27-49`, ruta relativa en `:48`); el bucle no arranca hasta que carga (`game.js:511-516`).
- **Bucle:** `requestAnimationFrame` con `dt` limitado a `1/30` s (`game.js:4`, `503-509`).
- **Ratón sobre canvas de tamaño fijo:** `mouseX = clientX − rect.left − clientLeft` sin escalar (`game.js:277-280`); en la plataforma el canvas se escala por CSS, así que hay que escalar a coordenadas lógicas.

El registro genérico (`lib/game-registry.ts`) ya existe desde la SPEC 07; esta spec solo añade una entrada, sin extraerlo de nuevo.

---

## Alcance

**Dentro:**

- **Motor** en `lib/arkanoid/` con `createArkanoidGame`: port fiel de `game.js`, `levels.js` y `spritesheet.js` sin globales, DOM ni `localStorage`.
  - Canvas lógico 480×640 (`game.js:2-3`), pala 96×14 a `y = 600`, bola 14 px, bloques 10×6 de 48×24 con margen superior 80 (`game.js:5-9`, `62`).
  - Puntuación 10 por bloque (`game.js:11`, `384`), 3 vidas (`game.js:12`), pérdida de vida al salir la bola por abajo (`game.js:399-406`).
  - **5 niveles** con los patrones de `levels.js:4-50` y velocidad `360 × (1 + 0,08 × (nivel − 1))` px/s (`game.js:14`, `133-135`). Superar el nivel 5 termina la partida con victoria (`game.js:389-396`).
  - Rebote en la pala con ángulo según el punto de impacto, máximo 60° (`game.js:22`, `337-354`) y colisión con bloques que invierte el eje de menor solape, un bloque por frame (`game.js:357-386`).
  - Partículas (8 por bloque, `game.js:23-28`, `144-160`) y explosión de 4 frames de 150 ms (`assets/spritesheet.js:1-11`).
  - **Sonido** de rebote y de bloque roto (`game.js:44-53`, `355`, `383`).
  - **Control con ratón** (la pala sigue al cursor, clic lanza la bola; `game.js:272`, `276-281`) y teclado (`A`/`D`/flechas mueven, `Espacio` lanza o continúa).
  - HUD propio del canvas con PUNTOS, NIVEL y vidas (`game.js:449-462`), sin RÉCORD.
- Assets en `public/games/arkanoid/`: `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3`.
- Registrar `arkanoid` en `lib/game-registry.ts` (480×640, sin opciones, adaptador de snapshot con `hud` Vidas y Nivel).
- Fila `arkanoid` en `games` por migración `0006_seed_arkanoid.sql`; portada `.cover-arkanoid`.
- HUD de plataforma: Jugador, Puntuación, Vidas, Nivel.
- Pausa por botón y por `Esc`/`P`, FIN, game over y victoria con el modal "FIN DEL JUEGO", "JUGAR DE NUEVO", guardado con `submitScore`.
- Añadir la spec 08 a `CLAUDE.md` y `README.md` en el mismo cambio.

**Fuera de alcance (specs futuras):**

- Récord local `arkanoid:v1:highScore` y el campo RÉCORD del HUD (`game.js:16`, `69-96`, `454`): el ranking es Supabase.
- Pantalla de inicio propia (`game.js:464-468`) y reinicio con `Espacio`/clic en game over o victoria (`game.js:182-183`).
- Selector de nivel en la pausa, por botones y por teclas `1`-`5` (`game.js:200-227`, `260-269`): permitiría saltarse niveles y falsear el ranking.
- Bloque `gray` del spritesheet (`assets/spritesheet.js:8`, `17`), sin uso en los 5 niveles.
- Controles táctiles (aviso "REQUIERE TECLADO"), pantalla completa, nuevos niveles, power-ups, cualquier cambio de reglas o balance.
- Supabase Auth, anti-trampa, otros juegos, cambios de esquema en `games`/`scores`, tests automatizados.

---

## Modelo de datos

```ts
// lib/arkanoid/types.ts
export type ArkanoidStatus = "playing" | "paused" | "gameover";

export interface ArkanoidSnapshot {
  score: number;
  lives: number;
  level: number; // 1..5
  status: ArkanoidStatus;
}

export interface ArkanoidCallbacks {
  onState(s: ArkanoidSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida (derrota o victoria)
}

export interface ArkanoidGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, 3 vidas, nivel 1
  end(): void;
  destroy(): void;
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): ArkanoidGame;
```

```ts
// lib/arkanoid/engine.ts (estado interno, no exportado)
// phase interna: "playing" | "levelcomplete" | "paused" | "gameover"
// "levelcomplete" se notifica como status "playing" (la plataforma no lo distingue).
```

```sql
-- supabase/migrations/0006_seed_arkanoid.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'arkanoid',
  'ARKANOID',
  'Rompe todos los bloques con la bola.',
  'Mueve la pala para que la bola no caiga y rompe los bloques de colores. Cinco niveles con patrones distintos y una bola más rápida en cada uno. Tienes tres vidas.',
  'ARCADE',
  'cover-arkanoid',
  'yellow',
  3
);
```

```
// Estructura de archivos nueva
lib/arkanoid/constants.ts   // CANVAS_W/H, BRICK_*, PADDLE_*, BALL_*, PARTICLE_*, LEVEL_COUNT, LEVEL_SPEED_STEP, MAX_DT, rutas de assets
lib/arkanoid/levels.ts      // LEVELS (levels.js:4-50)
lib/arkanoid/utils.ts       // ballSpeed, clamp
lib/arkanoid/types.ts
lib/arkanoid/sprites.ts     // SPRITES, EXPLOSION_FRAMES, carga de la imagen, drawSprite, drawFrame
lib/arkanoid/entities.ts    // createBricks, spawnParticles
lib/arkanoid/engine.ts      // createArkanoidGame
public/games/arkanoid/spritesheet-breakout.png
public/games/arkanoid/ball-bounce.mp3
public/games/arkanoid/break-sound.mp3
supabase/migrations/0006_seed_arkanoid.sql
```

Convenciones del juego (valores idénticos al original):

- Coordenadas con origen arriba a la izquierda; velocidades en px/s.
- Pala: 96×14, `y = 600`, velocidad de teclado 420 px/s, limitada a `[0, 480 − 96]` (`game.js:17-19`, `283-285`). Con ratón, la pala se centra en el cursor (`game.js:280`).
- Bola: 14 px; pegada al centro de la pala hasta lanzarla; al lanzar `vx = 0`, `vy = −ballSpeed(nivel)` (`game.js:121-142`). Velocidad constante dentro del nivel.
- Rebote en la pala solo con `vy > 0`: `offset` en `[−1, 1]` por el centro de la bola, `ángulo = offset × 60°`, `vx = v·sin`, `vy = −v·cos` (`game.js:337-354`).
- Colores de bloque por fila, de arriba abajo: red, yellow, cyan, magenta, hotpink, green (`game.js:10`). Partículas con sus hex (`game.js:29-37`), 4 px, vida 400 ms, velocidad 60-180 px/s, gravedad 900 px/s² (`game.js:23-28`).
- Pérdida de vida: `ball.y > 640`; con 0 vidas, game over; si no, bola pegada de nuevo, la pala no se mueve (`game.js:399-406`).
- Nivel completado: sin bloques vivos. Niveles 1-4: fase `levelcomplete`, la bola queda quieta y `Espacio` o clic arrancan el siguiente (pala centrada, bola pegada, sin efectos; `game.js:163-171`, `184-185`, `389-393`). Nivel 5: victoria y fin de partida (`game.js:394`).
- Canvas del juego (conservado del original): "Espacio o clic para lanzar" con la bola pegada (`game.js:498-499`) y "NIVEL N COMPLETADO / Espacio o clic para continuar" (`game.js:486-490`). El canvas no dibuja texto de pausa ni de game over.
- Teclas (`event.code`): `ArrowLeft`/`KeyA` izquierda, `ArrowRight`/`KeyD` derecha (mapa de teclas, `game.js:232-247`), `Space` lanza o continúa (ignorando `event.repeat`, `game.js:250-254`), `Escape`/`KeyP` pausa (pulsación única, solo desde `playing`, `game.js:255-259`, `192-198`). Se eliminan las teclas `1`-`9` (`game.js:260-269`).
- `preventDefault` sobre flechas, `A`/`D`, `Space` mientras el juego está montado (el original lo hacía con estas y con `P`/`Escape`, `game.js:239`, `245`, `251`, `256`), también en `keyup` de `Space`. Los eventos con `target` de tipo `input`, `textarea` o `select` se ignoran.
- Ratón: `mousemove` mueve la pala (ignorado en pausa y en game over), `mousedown` lanza o continúa. La coordenada se escala a lógica: `x = (clientX − rect.left) × (480 / rect.width)`.
- `dt` limitado a `1/30` s (`game.js:4`, `504`), más estricto que el máximo 0,05 s de `checklist.md` y necesario porque a 360 px/s la bola recorre 12 px por frame, casi su tamaño. `lastTime` se reinicia en `resume()`.
- Explosiones y partículas envejecen con `dt` (no con `performance.now()`), de modo que se congelan en pausa.
- Sonido: `Audio` creados dentro de `createArkanoidGame`, clonados al reproducir, con `catch` del autoplay (`game.js:50-53`). Un máximo de un sonido de rebote por frame (`game.js:317`, `355`). Sin sonido en pausa ni tras `destroy()`.
- El bucle no arranca hasta que la imagen del spritesheet carga; si `destroy()` llega antes, no se arranca.
- Rango de puntuación: máximo 184 bloques × 10 = 1.840, muy por debajo del límite de 1.000.000 de la BD; `GamePlayer` ya acota la puntuación al guardar.

---

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components, `useEffect`/refs y a servir archivos estáticos de `public/` (AGENTS.md); revisar `components/game-player.tsx`, `components/game-canvas.tsx`, `lib/game-registry.ts` y `lib/tetris/engine.ts` como patrón. Copiar el PNG y los 2 MP3 a `public/games/arkanoid/` y crear `lib/arkanoid/constants.ts`, `levels.ts`, `utils.ts` y `types.ts` con los valores del original. Verificación: `npx tsc --noEmit`; los 3 assets responden 200 en `/games/arkanoid/…` con el servidor de desarrollo.
2. Crear `lib/arkanoid/sprites.ts` (SPRITES, EXPLOSION_FRAMES, carga de imagen con promesa o callback cancelable, `drawSprite`, `drawFrame`) y `lib/arkanoid/entities.ts` (`createBricks`, `spawnParticles`). Verificación: `npx tsc --noEmit` y `npm run lint`.
3. Crear `lib/arkanoid/engine.ts`: estado, `update`/`draw` (bloques, explosiones, partículas, pala, bola, HUD del canvas, avisos de lanzar y de nivel completado), bucle rAF tras cargar el spritesheet, input de teclado en `window` y de ratón en el canvas con cleanup, sonido, `pause/resume/restart/end/destroy`, snapshot solo ante cambios y `onGameOver` único por derrota, victoria o FIN. Verificación: `npx tsc --noEmit` y `npm run lint`.
4. Registrar `arkanoid` en `lib/game-registry.ts` (480×640, `aria` "Arkanoid", sin opciones, adaptador con `hud` Vidas y Nivel). Verificación: `npx tsc --noEmit` y `npm run lint` pasan; `/juegos/asteroids/jugar` y `/juegos/tetris/jugar` no cambian; `/juegos/arkanoid/jugar` devuelve 404 hasta que el paso 5 inserte la fila en `games`.
5. Crear `supabase/migrations/0006_seed_arkanoid.sql` y aplicarla con `apply_migration`; regenerar `lib/supabase/database.types.ts` si hace falta. Comprobar `select sort_order from games` y usar el siguiente libre si el 3 está ocupado. Verificación: `list_migrations`, `select id from games` devuelve `asteroids`, `tetris` y `arkanoid`, `get_advisors` (security) sin avisos críticos, y `/juegos/arkanoid/jugar` monta el canvas con bloques, pala, bola y HUD.
6. Portada `.cover-arkanoid` en `app/globals.css` (aplicar `/frontend-design`; bloques y bola en amarillo, distinguible de `.cover-asteroids` y `.cover-tetris`) y comprobación del escalado del canvas vertical 480×640 en `.crt-portrait`. Verificación: tarjeta en `/juegos`, `/juegos/arkanoid` con portada, 375 px sin desbordar.
7. Verificar en el navegador con Playwright (jugar, guardar "TEST", ver leaderboard), borrar las filas de prueba de `scores` con `execute_sql`, y añadir la spec 08 a `CLAUDE.md` y `README.md` en el mismo commit. Verificación: ambos mencionan `08-arkanoid.md`; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `08-arkanoid: Paso N`. Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` según `AGENTS.md`. Para el diseño visual (portada, estados) aplicar `/frontend-design`, según `CLAUDE.md`.

---

## Criterios de aceptación

**Genéricos:**

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `supabase/migrations/0006_seed_arkanoid.sql` existe y figura en `list_migrations`; `games` contiene `arkanoid` (ARCADE, `cover-arkanoid`, yellow, `sort_order` 3 o el siguiente libre) y `get_advisors` (security) no reporta avisos críticos.
- [x] `/juegos` muestra la tarjeta ARKANOID con su portada; `/juegos/arkanoid` carga y "JUGAR AHORA" lleva a `/juegos/arkanoid/jugar`.
- [x] El canvas arranca sin errores en la consola ni hydration warnings, y el spritesheet y los 2 MP3 cargan con 200.
- [x] `PAUSA`/`REANUDAR` congela y continúa (bola, partículas, explosiones y sonido); `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en game over no tienen efecto; el canvas no dibuja texto de pausa; el overlay "EN PAUSA" muestra la pista de teclas.
- [x] Durante la pausa, el ratón y las teclas de movimiento no mueven la pala y `Espacio`/clic no lanzan la bola.
- [x] `Espacio` con el foco en PAUSA/FIN no activa el botón.
- [x] Las flechas y `Espacio` no hacen scroll en la página mientras Arkanoid está montado.
- [x] Perder la última vida, ganar el nivel 5 y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER" ni "VICTORIA".
- [x] "JUGAR DE NUEVO" reinicia a puntuación 0, 3 vidas, nivel 1 y bloques completos, con la bola pegada y sin teclas pegadas.
- [x] Guardar con nombre "TEST" inserta una fila con `game_id = 'arkanoid'`; nombre vacío guarda `INVITADO`; se muestra "PUNTUACIÓN GUARDADA_".
- [x] La puntuación aparece en la ficha, en el Salón (tab ARKANOID) y en la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [x] "SALIR" y "VOLVER AL VAULT" no dejan listeners, bucle ni sonidos activos (las flechas vuelven a hacer scroll).
- [x] En desarrollo (StrictMode) hay una sola instancia y la bola va a velocidad normal.
- [x] A 375 px de ancho el canvas se escala sin desbordar; el ratón mueve la pala hasta los bordes del canvas escalado; el aviso táctil solo aparece con `pointer: coarse`.
- [x] Asteroids y Tetris siguen funcionando igual.
- [x] `references/started-games/` y `lib/asteroids/` y `lib/tetris/` no han cambiado; no se escribe `localStorage`.
- [x] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Arkanoid:**

- [x] Al iniciar, el canvas muestra el nivel 1 (60 bloques en 6 filas, colores red, yellow, cyan, magenta, hotpink, green de arriba abajo), la pala centrada, la bola pegada a ella, el aviso "Espacio o clic para lanzar" y el HUD del canvas con PUNTOS 0, NIVEL 1 y 3 bolas; el HUD de plataforma muestra Jugador, Puntuación 0, Vidas ♥ ♥ ♥ y Nivel 01.
- [x] El canvas no muestra el campo RÉCORD.
- [x] `A`/`←` y `D`/`→` mueven la pala a 420 px/s sin salir del canvas; el ratón la centra bajo el cursor y la limita a los bordes.
- [x] `Espacio` o clic lanzan la bola recta hacia arriba (`vx = 0`) a la velocidad del nivel; con la bola ya lanzada no tienen efecto.
- [x] Un bloque roto suma exactamente 10 puntos, desaparece, genera 8 partículas y una explosión de 150 ms, y rompe como máximo un bloque por frame.
- [x] El rebote en la pala depende del punto de impacto: centro → vertical; borde → 60° respecto a la vertical.
- [x] La bola rebota en paredes laterales, techo y bloques sin atravesar bloques ni pala a 30 fps.
- [x] Perder la bola por abajo resta una vida, pega la bola a la pala y no reinicia los bloques; con 0 vidas abre el modal.
- [x] El nivel 1 tiene 60 bloques; los niveles 2 a 5 tienen 40, 30, 30 y 24 bloques con sus patrones.
- [x] Al romper el último bloque de los niveles 1-4 aparece "NIVEL N COMPLETADO", la bola queda quieta y `Espacio` o clic cargan el nivel siguiente con pala centrada y bola pegada; el HUD de plataforma muestra el nuevo nivel.
- [x] La velocidad de la bola es 360, 388,8, 417,6, 446,4 y 475,2 px/s en los niveles 1 a 5.
- [x] Al romper el último bloque del nivel 5 se abre el modal con la puntuación acumulada.
- [x] El rebote en paredes, techo o pala suena una vez por frame como máximo y un bloque roto suena al romperse; si el navegador bloquea el audio, no hay errores en la consola.
- [x] No existe selector de nivel ni teclas `1`-`5` que salten de nivel.
- [x] La puntuación máxima posible (1.840) se guarda sin error.

---

## Decisiones

- **Sí:** port fiel de `game.js` (reglas, puntuación, velocidades, colisiones, niveles) en `lib/arkanoid/`. Nada de rebalanceo.
- **Sí:** registrar el juego en el registro genérico existente (SPEC 07). Cero ramas por `game.id` en `GamePlayer`.
- **Sí:** puntuaciones en Supabase con `submitScore`; el récord local y su campo RÉCORD quedan fuera. El ranking es de la plataforma y `localStorage` está prohibido en motores.
- **Sí:** 5 niveles, y "nivel completado" se mantiene como fase interna que espera `Espacio`/clic. Es mecánica del original; notificada como `playing` para no ampliar el contrato `GameStatus`.
- **No:** selector de nivel en la pausa (decisión del usuario). Permitiría saltarse niveles y falsear el ranking; evita además una opción `restart` con sentido distinto al de Tetris.
- **No:** pantalla de inicio ni reinicio con `Espacio`/clic en game over o victoria. El contenedor controla inicio, fin y "JUGAR DE NUEVO" (`checklist.md`).
- **Sí:** victoria y derrota notifican por `onGameOver` y comparten el modal. El contrato no distingue victoria; sería un cambio de plataforma y va en otra spec.
- **Sí:** sonido portado (decisión del usuario), con `Audio` creado dentro de `createArkanoidGame` por no existir en servidor, y assets en `public/games/arkanoid/`.
- **Sí:** control con ratón y teclado (decisión del usuario); coordenada del ratón escalada a lógica porque la plataforma escala el canvas por CSS (el original no lo necesitaba).
- **Sí:** mantener `dt` máximo `1/30` s del original, más estricto que 0,05 s de `checklist.md`: a 0,05 s la bola avanzaría 18 px por frame, más que su tamaño de 14 px, y atravesaría bloques.
- **Sí:** explosiones envejecidas con `dt` en lugar de `performance.now()`. Con el reloj real, pausar hacía desaparecer las explosiones en curso; es una divergencia mínima y necesaria para que la pausa congele todo.
- **Sí:** mantener el HUD del canvas (sin RÉCORD): el margen superior de 80 px de los bloques está reservado para él (`game.js:9`) y el original lo tiene.
- **No:** `devicePixelRatio`; canvas lógico 480×640 escalado por CSS, como Asteroids y Tetris.
- **Sí:** `color` yellow (decisión del usuario), `cat` ARCADE y `sort_order` 3; `short` y `long` redactados a partir del original.
- **Sí:** copiar los assets a `public/` y dejar `references/` intacto.

---

## Riesgos

| Riesgo                                                            | Mitigación                                                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| StrictMode duplica bucle, listeners y sonido                      | `destroy()` cancela rAF, quita listeners de `window` y canvas y bloquea el arranque diferido; criterio de una sola instancia. |
| `new Audio`, `Math.random` o `Image` rompen el render en servidor | Todo se crea dentro de `createArkanoidGame`, que solo se llama desde `useEffect`; React renderiza el `<canvas>` vacío.        |
| El spritesheet tarda en cargar o falla                            | El bucle arranca al cargar; si falla, `console.error` como el original y el juego no queda en bucle roto.                     |
| `destroy()` antes de que cargue la imagen deja un rAF huérfano    | Bandera `destroyed` comprobada en el callback de carga.                                                                       |
| Ratón desalineado al escalar el canvas por CSS                    | Escalar con `rect.width`; criterio de aceptación a 375 px.                                                                    |
| Autoplay bloqueado o ráfaga de sonidos                            | `catch` en `play()`, un rebote por frame y clonado de `Audio`; sin sonido en pausa.                                           |
| `dt` grande al volver de otra pestaña (bola atraviesa bloques)    | Tope `1/30` s y `lastTime` reiniciado en `resume()`.                                                                          |
| Teclas pegadas al pausar o perder foco                            | Vaciar el mapa de teclas al pausar, terminar, reiniciar y en `blur` de la ventana.                                            |
| Foco en el selector del nombre o en un botón intercepta teclas    | Ignorar eventos con `target` `input`/`textarea`/`select`; `preventDefault` en `keyup` de `Espacio`.                           |
| Canvas vertical 480×640 no cabe en la altura del reproductor      | Reutilizar `.crt-portrait` de Tetris y comprobar en escritorio en el paso 6.                                                  |
| `sort_order` 3 ya ocupado cuando se implemente                    | Comprobar `select sort_order from games` en el paso 5; usar el siguiente libre y reflejarlo aquí.                             |
| Datos de prueba quedan en la BD                                   | Paso 7 borra `scores`; criterio "las filas de prueba están borradas".                                                         |

---

## Qué **no** está en esta spec

- Récord local y campo RÉCORD.
- Pantalla de inicio propia y reinicio con `Espacio`/clic.
- Selector de nivel en la pausa y teclas `1`-`5`.
- Distinguir victoria de derrota en el modal o en el leaderboard.
- Bloque `gray`, power-ups, niveles nuevos y cualquier cambio de reglas o balance.
- Controles táctiles y pantalla completa.
- Supabase Auth, anti-trampa, cambios de esquema en `games`/`scores` y otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
