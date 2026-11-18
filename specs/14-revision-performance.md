# SPEC 14 — Revisión de performance de los juegos

> **Estado:** Implementado
> **Depende de:** SPEC 05 (Asteroids), SPEC 07 (Tetris), SPEC 08 (Arkanoid), SPEC 09 (Snake), SPEC 10 (skins en el HUD), game-jam Frogger 01-03
> **Fecha:** 2026-11-18
> **Objetivo:** Que los 5 juegos mantengan ≥58 FPS en todos sus skins con CPU ×6, cacheando fondos estáticos y sprites con glow sin cambiar su aspecto.

---

## Por qué existe esta spec

Medición del 2026-11-18 (Playwright, dev server, 3 s por skin):

| Juego     | JS/frame (ms, máx. skin) | FPS CPU ×6 neon |
| --------- | ------------------------ | --------------- |
| Frogger   | 0,64                     | 50              |
| Arkanoid  | 0,35                     | 43              |
| Snake     | 0,25                     | 47              |
| Tetris    | 0,36                     | 60 (pastel 57)  |
| Asteroids | 0,28                     | 60              |

Línea base de `npm run perf` (Chromium con ventana, 2026-11-18; CPU ×1 = 60 FPS en todos los casos salvo ruido; JS/frame ×1 máx. skin: Asteroids 0,40, Tetris 0,61, Arkanoid 0,54, Snake 0,28, Frogger 0,64). FPS con CPU ×6 antes de optimizar:

| Juego     | classic/retro/pixel | neon | pastel |
| --------- | ------------------- | ---- | ------ |
| Asteroids | 43 / 19             | 18   | —      |
| Tetris    | 32 / 37             | 30   | 33     |
| Arkanoid  | 23 / 34             | 24   | —      |
| Snake     | 31 / 57             | 59   | —      |
| Frogger   | 40 / 39             | 41   | —      |

El JS sobra; el cuello es el `shadowBlur` por objeto en neon (GPU/raster), que en móvil de gama baja tira frames. Frogger además redibuja cada frame un fondo estático complejo.

---

## Alcance

**Dentro:**

- `scripts/perf.mjs` + `npm run perf`: Playwright (Chromium) contra el dev server; por juego y skin mide FPS y JS/frame (wrap de `requestAnimationFrame`) con CPU ×1 y ×6 (`Emulation.setCPUThrottlingRate`). Tabla en consola; sale con código 1 si algún caso con CPU ×6 queda <58 FPS. URL base por `PERF_URL` (por defecto `http://localhost:3000`).
- Helper compartido `lib/canvas-cache.ts`: capa estática cacheada y caché de sprites con glow (pre-render offscreen con `shadowBlur` una vez, `drawImage` cada frame).
- Frogger: fondo (`drawBackground`) cacheado por skin + casas llenas; vehículos, troncos y tortugas neon como sprites cacheados.
- Snake: rejilla cacheada por skin; segmentos neon y fruta con glow como sprites.
- Tetris: rejilla cacheada por skin; bloque neon como sprite por color (fantasma con `globalAlpha` sobre el sprite).
- Arkanoid: ladrillos, pala y bola neon como sprites por color/tamaño.
- Asteroids: asteroides neon como sprite por instancia (rotado con `drawImage`).
- Las cachés se invalidan al cambiar de skin (`setSkin`) y en `destroy`.
- `CLAUDE.md` y `README.md`: spec 14, `lib/canvas-cache.ts`, `npm run perf`.

**Fuera de alcance:**

- Cambios visuales, de jugabilidad, de skins o de HUD React.
- Elementos que cambian cada frame: rana de Frogger (escala en el salto), explosiones de Arkanoid, nave/balas/partículas de Asteroids, textos del HUD del canvas.
- Escalado por `devicePixelRatio`, OffscreenCanvas en worker, WebGL.
- Optimizar React, carga de assets, Supabase o bundle.
- CI que ejecute `npm run perf`.

---

## Modelo de datos

Sin datos persistentes. Estructuras en memoria de `lib/canvas-cache.ts`:

```ts
// Capa estática: se redibuja solo si cambia `key`.
interface LayerCache {
  draw(
    c: CanvasRenderingContext2D,
    key: string,
    paint: (c: CanvasRenderingContext2D) => void,
  ): void;
  clear(): void;
}

// Sprite con glow: canvas offscreen con margen = 2 × blur alrededor del objeto.
interface GlowSprite {
  canvas: HTMLCanvasElement;
  pad: number;
}
interface SpriteCache {
  get(
    key: string,
    w: number,
    h: number,
    pad: number,
    paint: (c: CanvasRenderingContext2D) => void,
  ): GlowSprite;
  clear(): void;
}
```

Claves: `"<skin>:<tipo>:<color>:<w>x<h>"` (p. ej. `neon:brick:#ff2bd6:64x24`). Frogger fondo: `"<skin>:<filled como 01001>"`.

---

## Plan de implementación

1. **Script de medición:** `playwright` como devDependency (+ `npx playwright install chromium`), `scripts/perf.mjs`, script `perf` en `package.json`. Anotar la línea base en la sección "Por qué".
   - **Verificación:** con `npm run dev` activo, `npm run perf` lista los 5 juegos × skins × CPU ×1/×6 y termina con código 1 (hay casos <58). `npm run lint` OK.
2. **`lib/canvas-cache.ts`:** `createLayerCache()` y `createSpriteCache()` según el modelo de datos. Sin uso todavía.
   - **Verificación:** `npm run lint` y `npm run build` OK.
3. **Frogger:** fondo con `LayerCache` (clave skin + casas llenas) en `lib/frogger/draw.ts`; vehículos/troncos/tortugas neon con `SpriteCache`; limpiar cachés en `setSkin`/`destroy` (`lib/frogger/engine.ts`).
   - **Verificación:** `npm run perf` → Frogger ≥58 FPS CPU ×6 en los 3 skins. Capturas antes/después por skin en `.playwright-screenshots/14-frogger-*.png`: mismo aspecto (casas, olas, carretera, glow neon). Casa llena se pinta al llegar; cambio de skin en vivo correcto.
4. **Snake:** rejilla con `LayerCache` y segmentos/fruta neon con `SpriteCache` (`lib/snake/engine.ts`, `lib/snake/skins.ts`).
   - **Verificación:** `npm run perf` → Snake ≥58 FPS CPU ×6 en los 3 skins. Capturas `14-snake-*.png` iguales a las previas; cabeza con ojos correctos.
5. **Tetris:** rejilla con `LayerCache` y bloque neon con `SpriteCache` (`lib/tetris/engine.ts`, `lib/tetris/skins.ts`).
   - **Verificación:** `npm run perf` → Tetris ≥58 FPS CPU ×6 en los 4 skins. Capturas `14-tetris-*.png`: pieza, fantasma (20 % alpha) y NEXT iguales.
6. **Arkanoid:** ladrillos/pala/bola neon con `SpriteCache` (`lib/arkanoid/skins.ts`, `lib/arkanoid/engine.ts`).
   - **Verificación:** `npm run perf` → Arkanoid ≥58 FPS CPU ×6 en los 3 skins. Capturas `14-arkanoid-*.png` iguales; vidas del HUD (bolas) siguen pintándose.
7. **Asteroids:** asteroides neon como sprite por instancia, rotado con `drawImage` (`lib/asteroids/entities.ts`).
   - **Verificación:** `npm run perf` → Asteroids ≥58 FPS CPU ×6 en los 3 skins. Capturas `14-asteroids-*.png` iguales; al partir un asteroide los hijos tienen su propio sprite.
8. **Docs:** `CLAUDE.md`, `README.md`; Estado → Implementado; marcar criterios.
   - **Verificación:** `npm run perf` termina con código 0; `npm run lint` y `npm run build` OK; `CLAUDE.md` y `README.md` coherentes entre sí.

Un commit por paso (`14-revision-performance: Paso N`).

---

## Criterios de aceptación

- [x] `npm run perf` existe, mide los 5 juegos en todos sus skins con CPU ×1 y ×6 y falla si algún caso queda <58 FPS.
- [x] Con CPU ×6 los 5 juegos dan ≥58 FPS en todos sus skins (`npm run perf` con código 0).
- [x] El JS medio por frame no sube respecto a la línea base en ningún juego/skin.
- [x] Capturas antes/después de cada juego y skin muestran el mismo aspecto (colores, glow, rejillas, fondos).
- [x] Cambiar de skin en vivo repinta fondo y sprites con el skin nuevo, sin restos del anterior.
- [x] Frogger: llenar una casa la pinta con la rana; al pasar de nivel las casas se vacían.
- [x] Sin errores en consola en los 5 reproductores.
- [x] `npm run lint` y `npm run build` sin errores.

---

## Decisiones

- **Sí:** los 5 juegos, aunque Asteroids/Tetris ya den 60 FPS. Tratamiento uniforme y margen en móviles más lentos que la emulación.
- **Sí:** caché de sprites con glow (pre-render con `shadowBlur` una vez). Mantiene el aspecto idéntico donde los glows se solapan.
- **No:** agrupar todo en un path por color con un solo `shadowBlur`. Cambia el resultado en solapes (ladrillos, segmentos, bloques).
- **Sí:** capa estática cacheada para fondos/rejillas, invalidada por clave (skin + estado relevante).
- **Sí:** helper común en `lib/canvas-cache.ts`. Se repite en 5 motores (regla de Shared code).
- **Sí:** visual idéntico; sin reducir el glow en `pointer: coarse`.
- **Sí:** objetivo ≥58 FPS con CPU ×6, medido con un script del repo reproducible (`npm run perf`).
- **No:** medir solo a mano con Playwright MCP. No queda como herramienta para futuras specs.
- **No:** optimizar elementos que cambian cada frame (rana, explosiones, nave, textos). Cachearlos no ahorra nada.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Sprites a posición fraccionaria se ven algo distintos (remuestreo)           | Comparar capturas; si hay diferencia visible, redondear la posición de `drawImage` al píxel. |
| Glow recortado en el sprite                                                  | Margen `pad = 2 × blur` en cada sprite.                                                      |
| Caché crece sin límite (Asteroids por instancia, Arkanoid por ancho de pala) | Sprite guardado en la entidad y liberado con ella; claves por color/tamaño acotadas.         |
| Caché obsoleta tras cambiar skin                                             | Clave incluye el skin y `clear()` en `setSkin`.                                              |
| La emulación de CPU ×6 en headless no refleja GPU móvil                      | Revisión adicional en un móvil real por LAN (`ALLOWED_DEV_ORIGINS`), no bloqueante.          |
| `playwright` añade peso a `node_modules`                                     | Solo devDependency; solo Chromium.                                                           |

---

## Qué **no** hay en esta spec

- Cambios visuales o de jugabilidad, DPR, WebGL, workers.
- Optimización de React, assets, Supabase o bundle.
- CI de performance.
