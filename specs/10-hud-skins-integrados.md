# SPEC 10 — Selector de skin integrado en el HUD del reproductor

> **Estado:** Implementado
> **Depende de:** SPEC 01 (reproductor), SPEC 07 (registro genérico y opciones `live`/`restart`; skins de Tetris)
> **Fecha:** 2026-11-17
> **Objetivo:** Mover las opciones `live` (selector de skin) de la barra aparte `.player-options` a la barra `.player-hud`, junto a Jugador, Puntuación, Vidas/Nivel y los botones PAUSA/FIN/SALIR.

---

## Por qué existe esta spec

Hoy `components/game-player.tsx` pinta el HUD (`.player-hud`) y, debajo, una segunda barra `.player-options` con el selector de skin. Son dos paneles para información de partida y control que conviene ver juntos; la barra extra roba altura al canvas. Con los skins de Arkanoid y Snake en curso, todos los juegos con skin pasan por este mismo punto.

---

## Alcance

**Dentro:**

- En `components/game-player.tsx`, renderizar `liveOptions` dentro de `.player-hud`, entre las estadísticas y `.hud-actions` (mismo `renderOption` y mismo `changeOption`).
- Eliminar el bloque `<div className="player-options">` aparte.
- Ajustes en `app/globals.css`: el `.player-option` convive en la fila del HUD (alineación vertical con `.hud-stat`, sin margen/borde de barra propia); `.player-options` se elimina si queda sin uso.
- Cambio genérico: afecta a cualquier juego con opción `live` (Tetris, Asteroids, Arkanoid, Snake según tengan skins).
- Mantener `e.target.blur()` tras cambiar (flechas/Espacio no deben alterar el selector).
- Actualizar `CLAUDE.md` y `README.md` (mención de spec 10 y de que las opciones `live` van en el HUD).

**Fuera de alcance:**

- Opciones `restart`: siguen en el overlay de pausa.
- Cambiar el aspecto del `<select>` (botones, iconos), nuevas opciones o nuevas skins.
- Diseño específico para móvil: se usa el `flex-wrap` existente.
- Cambios en motores, registro, BD o `GameCanvas`.

---

## Modelo de datos

Sin datos nuevos. Se reutilizan `GameOption` (`lib/game-engine.ts`) y `appliesOn: "live"` del registro.

---

## Plan de implementación

1. **Reproductor:** mover el render de `liveOptions` a `.player-hud` y borrar la barra `.player-options`. Sistema funcional (selector visible y operativo en el HUD).
2. **Estilos:** ajustar `.player-hud`/`.player-option` en `globals.css` (alineación, espaciado, wrap) y eliminar CSS huérfano.
3. **Verificación con Playwright MCP:** en Tetris (y Arkanoid/Snake si ya tienen skins) comprobar escritorio y ancho ~390 px; capturas en `.playwright-screenshots/`.
4. **Docs:** CLAUDE.md y README.md; Estado → Implementado.

Un commit por paso (`10-hud-skins-integrados: Paso N`).

---

## Criterios de aceptación

- [x] En un juego con skin, el selector aparece dentro de `.player-hud`; no existe ningún elemento `.player-options` en el DOM.
- [x] Cambiar de skin durante la partida sigue aplicándose en vivo sin reiniciar ni perder puntuación.
- [x] Tras cambiar de skin, el foco sale del `<select>` y las flechas/Espacio siguen controlando el juego.
- [x] PAUSA, FIN y SALIR siguen funcionando y alineados a la derecha en escritorio.
- [x] En juegos sin opciones `live` el HUD se ve igual que antes.
- [x] A ~390 px de ancho nada desborda horizontalmente; los elementos envuelven a otra línea.
- [x] Las opciones `restart` siguen apareciendo solo en el overlay de pausa.
- [x] `npm run lint` y `npm run build` sin errores.

---

## Decisiones

- **Select compacto en lugar de botones:** mínimo cambio, reutiliza `renderOption`; botones ocupan más ancho.
- **Genérico en `game-player`:** sin ramas por juego, coherente con la regla del registro.
- **`restart` sin tocar:** cambiar mitad de partida requiere reinicio; el overlay de pausa ya lo gestiona.
- **Wrap natural:** evita CSS específico de móvil; se reevalúa si la verificación lo muestra roto.

---

## Riesgos

- Barra HUD estrecha con muchos stats (Arkanoid: vidas + nivel) + select + 3 botones: puede envolver feo en anchos medios; revisar en Playwright.
- Spec concurrente: los agentes `skin-designer` de Arkanoid/Snake tocan el registro; esta spec no, pero verificar cuando terminen.
