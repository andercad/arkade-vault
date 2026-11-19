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
- Mando táctil: `touchControls` en `GAME_REGISTRY` (`dpad` con las direcciones que usa el juego y `actions` de 0 a 2 botones; `components/touch-controls.tsx` los pinta solo con `@media (pointer: coarse)` y emite `KeyboardEvent` sintéticos en `window`). Sin él, el juego no es jugable en móvil.
- Los motores **no deben filtrar `e.isTrusted`**: las teclas del mando son sintéticas. Leer `e.code`, no `e.key`.

## Datos y leaderboard

- El juego entra al catálogo **solo por migración**: `supabase/migrations/NNNN_seed_<slug>.sql` con `insert into public.games` (`id` = slug, `cat` y `color` = el par del mapa "Color por categoría" (`games_cat_color_check`), `cover` = `cover-<slug>`, `sort_order` = siguiente libre). Aplicar con `apply_migration`; comprobar con `list_migrations` y `get_advisors`.
- Sin cambios de esquema en `games`/`scores`/`game_stats`; si hace falta otro, es otra spec.
- Guardado con `submitScore({ gameId, name, score })` (`lib/scores.ts`); nombre vacío → `"INVITADO"`, máx. 10 caracteres, mayúsculas; fallo → "NO SE PUDO GUARDAR · REINTENTA".
- Puntuación entera entre 0 y 1.000.000 (CHECK de BD); si el juego puede superar ese rango, decidirlo en la spec.
- Biblioteca, home, ficha, Salón y actividad leen de BD (`getGames`, `getGame`, `getTopScores`…) y no necesitan código nuevo.
- Portada `.cover-<slug>` en `app/globals.css`, distinguible de las existentes; aplicar `/frontend-design`.
- Sin service role key ni secretos en el repo.

## Color por categoría (SPEC 15)

El color no se elige: se deriva de `cat` con este mapa (fuente única en código: `CATEGORY_COLOR` de `lib/games.ts`; en BD lo impone `games_cat_color_check`). BD, tipos y CSS ya admiten las 11 categorías y colores, así que **no hay paso de ampliación de CHECK/tipos/CSS** por juego.

| Categoría  | Color     |
| ---------- | --------- |
| ARCADE     | `green`   |
| PUZZLE     | `cyan`    |
| SHOOTER    | `magenta` |
| VERSUS     | `yellow`  |
| RACING     | `orange`  |
| PLATFORMER | `violet`  |
| FIGHTING   | `red`     |
| MAZE       | `blue`    |
| SPORTS     | `lime`    |
| RHYTHM     | `pink`    |
| STRATEGY   | `silver`  |

Criterio de aceptación: la tarjeta de `/juegos` muestra el botón JUGAR con el color de su categoría.

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
- [ ] A 375 px el canvas no desborda; el mando táctil solo aparece con `pointer: coarse` y cada botón maneja el juego (sin teclas pegadas al soltar).
- [ ] Asteroids y los demás juegos registrados siguen funcionando igual.
- [ ] `references/started-games/` no ha cambiado.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.
