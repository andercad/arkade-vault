# Performance por juego — Estado

> Mantenido por el agente `game-performance-booster`. Un juego por corrida. Referencia: `specs/14-revision-performance.md`. Línea base medida el 2026-11-18 (Playwright, dev server, 3 s por skin).

## Estado por juego

| Juego     | Analizado | FPS ×6 antes (peor skin) | FPS ×6 después | Fondo cacheado | Glow cacheado | ≥58 FPS ×6 | Notas | Última actualización |
| --------- | --------- | ------------------------ | -------------- | -------------- | ------------- | ---------- | ----- | -------------------- |
| snake     | ✅        | 47 (spec 14)             | 60 (todas las skins; JS 1,3-2,0 ms) | ✅ (rejilla, layer cache) | ✅ (fruta y segmentos, sprite cache) | ✅ | Causa: classic/retro dibujaban segmentos (roundRect/fillRect) y fruta (drawImage reescalando spritesheet grande) cada frame. Fix en engine.ts: segmentos y fruta siempre vía createSpriteCache (pad 0/2 sin glow). Visual verificado (3 skins + cambio en vivo), lint OK. | 2026-11-18 |
| tetris    | ✅        | 57 (pastel, spec 14)     | 60 (4 skins; JS 1,2-2,3 ms) | ✅ | ✅ | ✅ | Causa: hasta 200 bloques del tablero redibujados cada frame (pixel ~40 fillRect/bloque; neon drawImage 48px x200). Fix: sprite por skin+color en todos los skins + capa cacheada rejilla+bloques fijados (boardVersion en initGame/merge/clearLines). Visual verificado (4 skins, cambio en vivo, fantasma). | 2026-11-18 |
| asteroids | ✅        | 60 (SPEC 14)             | 60 (3 skins; JS 1,4-1,7 ms) | n/a (fondo plano) | ✅ sprite por instancia (SPEC 14) | ✅ | Sin cambios de código. Residual neon: balas, nave, partículas, HUD con shadowBlur por frame; no limita (60 FPS ×6). | 2026-11-18 |
| arkanoid  | ✅        | 43 (SPEC 14, neon)       | 60 (3 skins; JS 1,1-1,2 ms) | ✅ capa estática de ladrillos (repinta al romper/cambiar skin) | ✅ (sprites ladrillo/pala/bola, clear en setSkin/destroy) | ✅ | Causa JS alto: `audio.cloneNode().play()` por sonido -> pool de 6 Audio reutilizados; ladrillos (~60 drawImage/frame) -> brickLayer. Visual verificado (3 skins, cambio en vivo). | 2026-11-18 |
| frogger   | ✅        | 50 (SPEC 14, neon)       | 60 (3 skins; JS 2,1-2,3 ms) | ✅ | ✅ | ✅ | Causa: vehículos/troncos/tortugas sin glow se pintaban con paths+arcTo cada frame y HUD con fillText cada frame. Fix: sprites completos cacheados en todos los skins, HUD estático en capa cacheada (clave skin:score:level:lives), solo barra de tiempo por frame. | 2026-11-18 |

Medición final: `PERF_GAMES=<id> npm run perf`, un juego cada vez con la máquina libre (2026-11-18). Mediciones con varios juegos/agentes en paralelo o con otra carga no son válidas (±10-20 FPS de ruido).

Leyenda: `✅` aplicado y verificado · `🟡` en progreso · `—` pendiente · `n/a` no aplica
