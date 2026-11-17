# SPEC 11 — Botón de leaderboard en el menú de fin y reset del menú al salir

> **Estado:** Implementado
> **Depende de:** SPEC 01 (reproductor), SPEC 06 (leaderboard y Salón de la fama), SPEC 10 (HUD del reproductor)
> **Fecha:** 2026-11-17
> **Objetivo:** Añadir al menú de fin un botón que lleve al Salón de la fama con la pestaña del juego abierta y evitar que el menú de fin reaparezca abierto al volver a entrar en un juego tras salir con VOLVER AL VAULT.

---

## Por qué existe esta spec

Tras guardar (o no) la puntuación, el jugador solo puede reiniciar o volver al vault; no hay acceso directo a ver su posición. Además hay un bug: al pulsar VOLVER AL VAULT con el modal abierto y entrar luego en un juego, el modal "FIN DEL JUEGO" aparece de nuevo como si siguiese abierto.

Causa probable (a confirmar en el paso 1): `next.config.ts` tiene `cacheComponents: true`, así que Next conserva el estado de React de la página anterior al navegar (Activity). `GamePlayer` mantiene `over = true` aunque `GameCanvas` destruya y recree el motor.

---

## Alcance

**Dentro:**
- el .input-row (input + GUARDAR PUNTUACIÓN) del modal de fin no desborda a ~390 px.
- Botón nuevo en el modal de fin de `components/game-player.tsx`, junto a JUGAR DE NUEVO y VOLVER AL VAULT: `VER LEADERBOARD` → `/salon-de-la-fama?juego=<game.id>`.
- Al pulsarlo se navega y el modal se descarta (la puntuación no guardada se pierde, igual que con VOLVER AL VAULT).
- `app/salon-de-la-fama/page.tsx` lee `searchParams.juego` (dentro del `Suspense` existente) y lo pasa a `HallOfFame` como `initialGameId`.
- `components/hall-of-fame.tsx`: pestaña inicial = `initialGameId` si coincide con un juego existente; si no, el primero (comportamiento actual).
- Corregir el bug: el estado del reproductor (`over`, `saved`, `saving`, `saveError`, `typedName`, `snap`) se reinicia al salir de la página, de modo que al volver a entrar el modal está cerrado y la partida empieza limpia.
- Verificar que el modal se cierra en todos los caminos de salida: VOLVER AL VAULT, VER LEADERBOARD, JUGAR DE NUEVO, SALIR del HUD, botón Atrás del navegador.
- Cambiar `global.css` para ajustar boton guardar puntuación
- Actualizar `CLAUDE.md` y `README.md` (mención de spec 11, del parámetro `?juego=` y del reset).

**Fuera de alcance:**

- Mostrar el leaderboard dentro del modal sin salir.
- Conservar la puntuación sin guardar al navegar.
- Pestaña persistente / sincronizada con la URL al cambiar de pestaña en el Salón de la fama.
- Resaltar la puntuación recién guardada en la tabla.
- Cambios en motores, registro, BD o `GameCanvas`.

---

## Modelo de datos

Sin datos nuevos en BD. Único contrato nuevo:

```ts
// components/hall-of-fame.tsx
{ games: Game[]; scores: Record<string, ScoreRow[] | null>; initialGameId?: string }
```

URL: `/salon-de-la-fama?juego=<games.id>` (p. ej. `?juego=tetris`). Valor desconocido → se ignora.

---

## Plan de implementación

1. **Diagnóstico con Playwright MCP:** reproducir el bug (jugar → FIN → VOLVER AL VAULT → entrar a un juego) y confirmar que el estado se conserva por `cacheComponents`. Si la causa es otra, anotarla en Decisiones antes de seguir. Sin cambios de código.
2. **Reset del reproductor:** en `components/game-player.tsx`, reiniciar el estado al ocultarse/desmontarse la página (cleanup de efecto que resetea `over`, `saved`, `saving`, `saveError`, `typedName`, `snap`). Si no basta, usar `key` por visita. Sistema funcional: el modal ya no reaparece.
3. **Pestaña inicial en el Salón:** `initialGameId` en `HallOfFame` y lectura de `searchParams.juego` en `app/salon-de-la-fama/page.tsx`. Probar a mano `/salon-de-la-fama?juego=snake`.
4. **Botón VER LEADERBOARD:** añadirlo al modal de fin con `Link` a `/salon-de-la-fama?juego=${game.id}`; estilo coherente con los botones de `.actions` (ajustar `globals.css` solo si el wrap lo exige).
5. **Verificación con Playwright MCP y docs:** recorrer los caminos de salida de los criterios, capturas en `.playwright-screenshots/`; actualizar CLAUDE.md y README.md; Estado → Implementado.

Un commit por paso (`11-fin-leaderboard-y-reset: Paso N`).

---

## Criterios de aceptación

- [x] El modal de fin muestra un botón `VER LEADERBOARD` junto a JUGAR DE NUEVO y VOLVER AL VAULT.
- [x] Pulsarlo desde Tetris navega a `/salon-de-la-fama?juego=tetris` y la pestaña activa es TETRIS; igual con cada juego del registro.
- [x] `/salon-de-la-fama` sin parámetro y con `?juego=inexistente` abren la primera pestaña sin error.
- [x] Tras FIN → VOLVER AL VAULT → entrar en cualquier juego, el modal de fin no aparece y la partida arranca con puntuación 0.
- [x] Tras FIN → VER LEADERBOARD → Atrás del navegador, el modal no aparece abierto.
- [x] Tras FIN → guardar puntuación → salir → volver a entrar, el modal no muestra "PUNTUACIÓN GUARDADA" ni el nombre escrito.
- [x] JUGAR DE NUEVO sigue cerrando el modal y reiniciando la partida.
- [x] A ~390 px de ancho los tres botones del modal no desbordan horizontalmente.
- [x] a ~390 px GUARDAR PUNTUACIÓN queda dentro del modal, sin scroll horizontal causado por el modal.
- [x] `npm run lint` y `npm run build` sin errores.

---

## Decisiones

- **Sí:** destino Salón de la fama con `?juego=<id>`. Reutiliza el top 12 por pestaña ya existente; no duplica leaderboard.
- **No:** `/juegos/[id]` como destino. Funciona, pero el Salón es la pantalla dedicada a ranking.
- **Sí:** navegar y descartar el modal. Coherente con VOLVER AL VAULT y sin estado extra.
- **No:** overlay de leaderboard dentro del modal. Más alcance (carga de datos en cliente, estados de error).
- **Sí:** reset genérico en `game-player`. Sin ramas por juego, igual que la regla del registro.
- **Sí:** parámetro `juego` (castellano), consistente con las rutas en español.
- **Pendiente de confirmar en el paso 1:** que la causa sea la conservación de estado por `cacheComponents`.

---

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                          |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Leer `searchParams` con `cacheComponents` exige estar dentro de `Suspense` | `HallData` ya está dentro del `Suspense` de la página; no leerlo fuera.                             |
| Estado del Salón conservado al volver con otro `?juego=`                   | La pestaña se calcula de `initialGameId`; si Activity la conserva, forzar `key={initialGameId}`.    |
| El reset en cleanup de efecto no se ejecuta al ocultarse la página         | Alternativa: `key` por visita en `GamePlayer`; validar en el paso 1 y 2.                            |
| La puntuación no guardada se pierde al pulsar VER LEADERBOARD por error    | Aceptado (misma conducta que VOLVER AL VAULT); confirmación o guardado previo queda para otra spec. |

---

## Qué **no** hay en esta spec

- Leaderboard embebido en el modal.
- Persistencia de puntuaciones sin guardar.
- Sincronizar la pestaña del Salón con la URL al cambiar de pestaña.
- Cambios en BD, motores o registro de juegos.
