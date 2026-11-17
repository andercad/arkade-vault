# SPEC — Frogger: plataforma (registro, migración, portada, HUD y guardado de puntuación)

> **Estado:** Propuesto
> **Depende de:** 06-games-table-leaderboard-supabase (SPEC 06), 07-tetris (registro genérico), 09-snake, game-jam/frogger/01-frogger-core
> **Fecha:** 2026-11-17
> **Objetivo:** Integrar el motor de Frogger en la plataforma: registro en `GAME_REGISTRY`, fila en `games`, portada, HUD de plataforma, pausa, modal de game over y guardado en `scores`.

## Scope

**In:**

- Entrada `frogger` en `lib/game-registry.ts` (canvas 600×560, `aria` "Frogger", sin opciones, adaptador snapshot → HUD).
- Migración `supabase/migrations/0008_seed_frogger.sql` con la fila en `games`.
- Portada `.cover-frogger` en `app/globals.css`.
- HUD de plataforma (Jugador, Puntuación, Vidas, Nivel) y HUD interno del canvas (spec 01): HUD doble.
- Pausa por botón de plataforma, FIN, modal "FIN DEL JUEGO", "JUGAR DE NUEVO", guardado con `submitScore`.
- Añadir las specs de Frogger a `CLAUDE.md`, `README.md` y `references/implemented-games.md` al implementar.

**Fuera de alcance:**

- Motor del juego (spec 01) y extras (spec 03).
- Controles táctiles/mobile (solo aviso "REQUIERE TECLADO" existente), Supabase Auth/RLS, Realtime en leaderboard.
- Cambios de esquema en `games`/`scores`, anti-trampa, tests automatizados.

## Data model

```sql
-- supabase/migrations/0008_seed_frogger.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'frogger',
  'FROGGER',
  'Cruza la carretera y el río sin caer.',
  'Salta entre coches y camiones, súbete a troncos y tortugas y llega a las cinco casas antes de que se acabe el tiempo. Cada nivel el tráfico y la corriente van más rápido.',
  'ARCADE',
  'cover-frogger',
  'lime',
  5
);
```

```ts
// Props del reproductor (contrato de la plataforma, derivado del registro)
interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

Notas de integración:

- El repo no usa `components/games/<Name>Game.tsx` ni `app/games/<id>/play`: el reproductor genérico vive en `components/game-player.tsx` y `components/game-canvas.tsx`, la ruta es `/juegos/frogger/jugar` y el `[id]` debe existir en `GAME_REGISTRY` y en `games`. `FroggerGameProps` se satisface en el adaptador: `onState(s)` → `onScoreChange(s.score)`, `onLivesChange(s.lives)`, `onLevelChange(s.level)`; `paused` → `pause()/resume()`; `onGameOver` → modal.
- Orden: `onLivesChange(0)` siempre antes de `onGameOver(score)`.
- Adaptador `hud`: `Vidas` y `Nivel` (más Jugador y Puntuación genéricos).
- Guardado: `submitScore` inserta `{ game_id: 'frogger', player_name: name, score, user_id: null }`; el nombre se pre-rellena con `localStorage.getItem('av_player_name')` y se persiste al guardar (comportamiento que ya implementa `GamePlayer`; verificar y, si falta, añadirlo de forma genérica sin ramas por `game.id`). Nombre vacío guarda `INVITADO`.
- `sort_order` 5 y migración `0008`: comprobar con `select sort_order from games` y `list_migrations`; usar el siguiente libre si están ocupados.

## Implementation plan

1. **Registro.**
   - Leer `components/game-player.tsx`, `components/game-canvas.tsx` y `lib/game-registry.ts`; seguir la entrada de Snake.
   - Añadir `frogger` (600×560, `aria` "Frogger", sin opciones, `hud` Vidas y Nivel).
   - Verificación: `npx tsc --noEmit` y `npm run lint`; los demás juegos no cambian.
2. **Migración.**
   - Crear y aplicar `0008_seed_frogger.sql` con `apply_migration`; regenerar `lib/supabase/database.types.ts` si hace falta.
   - Verificación: `list_migrations`, `select id from games` incluye `frogger`, `get_advisors` (security) sin avisos críticos.
3. **Portada.**
   - Añadir `.cover-frogger` en `app/globals.css` (aplicar `/frontend-design`: rana lima sobre franjas de carretera y agua, distinguible de las demás portadas).
   - Verificación: tarjeta en `/juegos`, `/juegos/frogger` con portada, 375 px sin desbordar.
4. **Pausa, game over y guardado.**
   - Comprobar que `paused` congela el motor, que el canvas no dibuja texto de pausa ni "GAME OVER" y que el modal muestra la puntuación real.
   - Comprobar nombre pre-rellenado, persistencia en `av_player_name` y "PUNTUACIÓN GUARDADA_".
   - Verificación: partida completa con Playwright MCP (jugar, perder 3 vidas, guardar "TEST", ver leaderboard).
5. **Limpieza y documentación.**
   - Borrar filas de prueba de `scores` con `execute_sql`.
   - Añadir las specs a `CLAUDE.md` y `README.md` y la fila a `references/implemented-games.md`.
   - Verificación: `npm run lint` y `npm run build` pasan.

Cada paso = un commit `frogger-platform: Paso N`.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `0008_seed_frogger.sql` figura en `list_migrations`; `games` contiene `frogger` (ARCADE, `cover-frogger`, lime) y `get_advisors` no reporta avisos críticos.
- [ ] `/juegos` muestra la tarjeta FROGGER con portada; `/juegos/frogger` carga y "JUGAR AHORA" lleva a `/juegos/frogger/jugar`.
- [ ] El canvas monta sin errores en consola ni hydration warnings; carga dinámica solo en cliente.
- [ ] HUD de plataforma muestra Jugador, Puntuación, Vidas (3) y Nivel (01), y se actualiza al jugar.
- [ ] `PAUSA`/`REANUDAR` congela y continúa; el canvas no dibuja texto de pausa; `Esc`/`P` no hacen nada dentro del canvas.
- [ ] Durante la pausa los saltos no actúan; al reanudar no hay salto de tiempo.
- [ ] `Espacio` con foco en PAUSA/FIN no activa el botón; las flechas y `W/A/S/D` no hacen scroll mientras el juego está montado.
- [ ] Perder la tercera vida o pulsar FIN abre el modal "FIN DEL JUEGO" con la puntuación real; `lives = 0` se refleja antes del modal.
- [ ] El modal pre-rellena el nombre desde `av_player_name`, lo persiste al guardar y "JUGAR DE NUEVO" reinicia a 0 puntos, 3 vidas, nivel 1.
- [ ] Guardar "TEST" inserta una fila con `game_id = 'frogger'`, `user_id = null`; nombre vacío guarda `INVITADO`.
- [ ] La puntuación aparece en la ficha, en el Salón (tab FROGGER) y en la actividad de la home.
- [ ] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos.
- [ ] En desarrollo (StrictMode) hay una sola instancia.
- [ ] A 375 px de ancho el canvas se escala sin desbordar.
- [ ] Asteroids, Tetris, Arkanoid y Snake siguen funcionando igual; `references/` (salvo la fila nueva en `implemented-games.md`) no cambia.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.

## Decisions

- **Sí:** registrar el juego en el registro genérico; cero ramas por `game.id` en `GamePlayer`.
- **Sí:** `cat` ARCADE, `color` lime, `cover` `cover-frogger`, `sort_order` 5. Razón: lime no lo usa ningún juego existente y distingue la tarjeta.
- **Sí:** HUD doble (canvas interno + React externo). Razón: el HUD interno mantiene el estilo arcade y el externo comparte layout con los demás juegos.
- **Sí:** pausa controlada exclusivamente por la plataforma (`paused`), sin P/Esc en el canvas. Razón: evitar doble fuente de verdad.
- **Sí:** 3 vidas, mostradas en el HUD de plataforma. Razón: mecánica original del género (ver spec 01).
- **Sí:** guardar con `user_id: null`. Razón: sin Auth en este alcance.
- **No:** distinguir victoria de derrota ni modos de juego. Razón: partida sin fin, solo game over.
- **No:** controles táctiles, Supabase Auth/RLS, Realtime en leaderboard ni cambios de esquema.
