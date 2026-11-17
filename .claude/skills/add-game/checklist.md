# Checklist técnico para añadir un juego (extraído de SPEC 05 y 06)

Reglas que toda spec generada por `/add-game` debe respetar. Si el código actual contradice algo, manda el código.

## Motor (`lib/<slug>/`)

- TypeScript, sin globales ni dependencias. API `create<Juego>Game(canvas, callbacks)` → `{ start, pause, resume, restart, end, destroy }`.
- Estructura: `constants.ts`, `utils.ts`, `types.ts`, `entities.ts` (si aplica), `engine.ts`.
- Valores y fórmulas idénticos al original (velocidades, cooldowns, puntuación). Sin cambios de reglas ni balance.
- Bucle con `requestAnimationFrame`; `dt` máximo 0,05 s; reiniciar `lastTime` en `resume()`.
- `destroy()` cancela el rAF y quita **todos** los listeners. Listeners de teclado en `window`, registrados en `start()`.
- Sin dobles instancias en StrictMode (una sola velocidad, un solo juego).
- Notifica un snapshot (`score` + campos del HUD + `status`) a `onState` **solo cuando cambia** un campo; `onGameOver(finalScore)` una vez por partida.
- Estados: `playing`, `paused`, `gameover` (+ los propios del juego). `end()` fuerza game over desde cualquier estado y pasa por `onGameOver`.
- El canvas **no dibuja** overlays de pausa ni de game over, ni reinicia con Espacio/Enter. El HUD propio del canvas puede mantenerse si el original lo tiene.
- Quitar del original: IDs del DOM, overlays/menús, `localStorage`, `alert`, listeners sin cleanup.

## Input

- `preventDefault` solo sobre las teclas del juego (flechas, Espacio…) mientras está montado; también en `keyup` de Espacio para que un botón con foco no se active.
- Vaciar el mapa de teclas al pausar, terminar, reiniciar y en `blur` de la ventana.
- Pausa por botón y por teclas (`Escape`/`KeyP`): pulsación única (ignorar `event.repeat`), ignoradas en game over. Un solo estado de pausa con dos entradas.
- Teclas pulsadas durante la pausa no actúan.

## Componente y reproductor

- `Math.random`, `localStorage` y el motor solo dentro de `useEffect`; React renderiza solo el `<canvas>` vacío (sin hydration warnings).
- Patrón de `components/game-canvas.tsx` (ya genérico, no se crea componente por juego): `ref` + `useImperativeHandle` con `pause/resume/restart/end/setOption`, callbacks vía ref para no recrear el motor, `destroy()` en el cleanup.
- El contenedor (`GamePlayer`) controla pausa y fin: botones PAUSA/REANUDAR, FIN, SALIR, overlay "EN PAUSA" (con pista de teclas), modal "FIN DEL JUEGO" con puntuación real, "JUGAR DE NUEVO" → `restart()`.
- Etiqueta del botón y overlay derivados de `snapshot.status` (reflejan también la pausa por teclado).
- `GamePlayer` no se ramifica por `game.id`: el juego se registra en el registro genérico (`lib/game-registry.ts`); si no existe, la spec lo extrae primero sin cambiar el comportamiento de Asteroids.
- Canvas lógico fijo, escalado por CSS al 100 % del ancho con `aspect-ratio` y `max-width`; sin escalado por `devicePixelRatio` salvo decisión explícita.
- Aviso "REQUIERE TECLADO" solo con `@media (pointer: coarse)` (clase `.keyboard-notice` ya existe).

## Datos y leaderboard

- El juego entra al catálogo **solo por migración**: `supabase/migrations/NNNN_seed_<slug>.sql` con `insert into public.games` (`id` = slug, `cat` y `color` dentro de los CHECKs, `cover` = `cover-<slug>`, `sort_order` = siguiente libre). Aplicar con `apply_migration`; comprobar con `list_migrations` y `get_advisors`.
- Sin cambios de esquema en `games`/`scores`/`game_stats` (salvo ampliar los CHECK de `cat`/`color`, ver abajo); si hace falta otro, es otra spec.
- Guardado con `submitScore({ gameId, name, score })` (`lib/scores.ts`); nombre vacío → `"INVITADO"`, máx. 10 caracteres, mayúsculas; fallo → "NO SE PUDO GUARDAR · REINTENTA".
- Puntuación entera entre 0 y 1.000.000 (CHECK de BD); si el juego puede superar ese rango, decidirlo en la spec.
- Biblioteca, home, ficha, Salón y actividad leen de BD (`getGames`, `getGame`, `getTopScores`…) y no necesitan código nuevo.
- Portada `.cover-<slug>` en `app/globals.css`, distinguible de las existentes; aplicar `/frontend-design`.
- Sin service role key ni secretos en el repo.

## Categoría o color nuevo

Valores permitidos en una spec: `cat` ∈ `ARCADE, PUZZLE, SHOOTER, VERSUS, RACING, FIGHTING, PLATFORMER, MAZE, RHYTHM, SPORTS, STRATEGY`; `color` ∈ `cyan, magenta, yellow, green, orange, violet, red`. Hoy BD y código solo admiten `ARCADE|PUZZLE|SHOOTER|VERSUS` y `cyan|magenta|yellow|green` (comprobar `Category`/`AccentColor` en `lib/games.ts` y los CHECK de `games`).

Si el `cat` o el `color` del juego no está soportado, la spec añade un paso **antes** de la migración seed:

- Migración `NNNN_extend_games_checks.sql`: `drop constraint` de `games_cat_check` y/o `games_color_check` y `add constraint … check (… in (lista completa de valores soportados))`. Aplicar con `apply_migration`; regenerar `lib/supabase/database.types.ts`.
- Actualizar `Category`, `AccentColor` y `CATEGORIES` en `lib/games.ts`.
- Estilos de acento del color nuevo en `app/globals.css` (mismas variantes que `cyan|magenta|yellow|green`; aplicar `/frontend-design`).
- Criterio de aceptación: la fila se inserta; la tarjeta, la ficha y el chip de filtro de `/juegos` muestran el acento y la categoría correctos.

## Criterios de aceptación genéricos (copiar y adaptar)

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Migración presente en `supabase/migrations/` y en `list_migrations`; `games` contiene la fila nueva con los datos de la spec; `get_advisors` (security) sin avisos críticos.
- [ ] `/juegos` muestra la tarjeta con su portada; `/juegos/<slug>` carga y "JUGAR AHORA" lleva a `/juegos/<slug>/jugar`.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings.
- [ ] Controles del juego funcionan; la página no hace scroll con las teclas del juego.
- [ ] PAUSA/REANUDAR congela y continúa; `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en game over no tienen efecto; el canvas no dibuja texto de pausa.
- [ ] Espacio con el foco en PAUSA/FIN no activa el botón.
- [ ] Condición de derrota del juego y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] "JUGAR DE NUEVO" reinicia el estado completo sin teclas pegadas.
- [ ] Guardar con nombre "TEST" inserta fila con `game_id = '<slug>'`; nombre vacío guarda `INVITADO`; muestra "PUNTUACIÓN GUARDADA_".
- [ ] La puntuación aparece en la ficha, el Salón (tab del juego) y la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [ ] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos (las flechas vuelven a hacer scroll).
- [ ] En desarrollo (StrictMode) hay una sola instancia y velocidad normal.
- [ ] A 375 px el canvas no desborda; el aviso táctil solo aparece con `pointer: coarse`.
- [ ] Asteroids y los demás juegos registrados siguen funcionando igual.
- [ ] `references/started-games/` no ha cambiado.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.
