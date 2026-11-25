# SPEC 21 — Color de categoría en la UI

> **Estado:** Implementado
> **Depende de:** SPEC 02 (homepage), SPEC 06 (leaderboard y juegos), SPEC 15 (colores por categoría)
> **Fecha:** 2026-11-24
> **Objetivo:** Que la etiqueta de categoría, el título del juego en la actividad, los chips de filtro y el botón JUGAR de la ficha usen el color de la categoría del juego, y que el nombre de usuario en la actividad tenga un color único.

---

## Por qué existe esta spec

- SPEC 15 dio un color fijo por categoría, pero solo lo usa el botón JUGAR de la tarjeta de biblioteca.
- La etiqueta de categoría sale siempre cian (`.card .cover .label`) o gris (`.mini-cat`, `.detail-tags span`).
- En "Últimas puntuaciones" el color del juego está en el nombre del jugador (`tk-p neon-<color>`): parece un color del usuario.
- "▶ JUGAR AHORA" de la ficha es cian para todos, distinto del botón de la tarjeta.
- Chips del filtro: todas iguales, activo siempre magenta.
- El hover de la tarjeta de biblioteca (`.card:hover`, `.card::before`) ilumina siempre en cian, sea cual sea la categoría.

---

## Alcance

**Dentro:**

- `app/globals.css`: clases `.accent-<color>` (11) que definen `--accent: var(--<color>)`; reglas que consumen `--accent` (fallback `--cyan`) con `color-mix()` para glows.
- `components/game-card.tsx`: `.label` con `accent-<color>` → texto y borde del color.
- `components/game-card.tsx` + `app/globals.css`: `div.card` con `accent-<color>`; `.card:hover` (borde y sombra) y `.card::before` (degradado de esquina) en `var(--accent, var(--cyan))` con `color-mix()`, en vez de cian fijo.
- `components/home/mini-card.tsx`: `.mini-cat` en el color del juego.
- `app/juegos/[id]/page.tsx`: tag de categoría (primer `span` de `.detail-tags`) en color/borde del juego; botón "▶ JUGAR AHORA" → `btn xl pulse <color>` con pulse en el color del juego.
- `components/home/activity-section.tsx`: `tk-p` sin `neon-<color>`, color `--ink` fijo; `tk-mid` ("▸ TÍTULO") en `neon-<color>`.
- `components/library.tsx`: cada chip de categoría con `accent-<CATEGORY_COLOR[c]>` → texto en su color; activo con borde y glow de su color; `TODOS` activo en blanco (`--ink`, clase `chip-all`), no en magenta (evita confundirlo con SHOOTER).
- `CLAUDE.md` (SPEC 21 en la lista) + `README.md` sincronizado.

**Fuera:**

- Título h2 de la ficha (sigue `neon-cyan`), salón de la fama (pestañas), leaderboard, TOP JUGADORES, HUD/reproductor, menú de fin.
- Añadir la categoría a "Últimas puntuaciones" o cambiar `getRecentScores`/`RecentScore`.
- Portadas `.cover-*`, colores de BD, migraciones.
- `btn.pulse` en otros sitios (sin clase de color mantiene cian).
- Hover de `.mini-card` de la home (sigue cian; spec futura si se quiere).
- Cambiar el color de la categoría PUZZLE (sigue cian); sería una spec nueva que enmiende la SPEC 15.

---

## Modelo de datos

Sin datos nuevos ni migración. Fuente del color: `game.color` (`Game`, `RecentScore.color`) y `CATEGORY_COLOR` (`lib/games.ts`) para los chips.

CSS nuevo (patrón):

```css
.accent-green {
  --accent: var(--green);
} /* … 11 colores */
.card .cover .label {
  color: var(--accent, var(--cyan));
  border-color: color-mix(in srgb, var(--accent, var(--cyan)) 55%, transparent);
}
.chip[class*="accent-"] {
  color: var(--accent);
}
.chip.active[class*="accent-"] {
  border-color: var(--accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 35%, transparent);
}
.btn.<color > {
  --accent: var(--<color>);
} /* para que el pulse herede */
/* keyframe btn-pulse: usa var(--accent, var(--cyan)) */
.card:hover {
  border-color: var(--accent, var(--cyan));
  box-shadow:
    0 18px 40px -10px
      color-mix(in srgb, var(--accent, var(--cyan)) 40%, transparent),
    0 0 0 1px color-mix(in srgb, var(--accent, var(--cyan)) 30%, transparent);
}
.card::before {
  background: linear-gradient(
    135deg,
    transparent 60%,
    color-mix(in srgb, var(--accent, var(--cyan)) 40%, transparent)
  );
}
```

Nota (descubierta en el Paso 3): Tailwind 4 define su propio `@keyframes pulse { 50% { opacity: .5 } }`, que pisaba el de `globals.css` y dejaba el glow sin animar. Se renombra el keyframe propio a `btn-pulse` (`.btn.pulse` apunta a él).

(Detalle final con `/frontend-design`; legibilidad en oscuro, sobre todo `silver`/`yellow`/`lime`.)

---

## Plan de implementación

1. **CSS de acento.**
   - `.accent-<color>` ×11, `--accent` en `.btn.<color>`, keyframe del pulse con `var(--accent, var(--cyan))` + `color-mix`.
   - Verificación: `npm run lint` limpio; home y `/juegos` sin cambios visuales aún (Playwright snapshot; "▶ JUGAR AHORA" sigue cian).
2. **Etiquetas de categoría (card, mini-card, ficha).**
   - `game-card.tsx`, `mini-card.tsx`, `app/juegos/[id]/page.tsx` (tag) con `accent-<game.color>`.
   - Verificación: Playwright en `/`, `/juegos`, `/juegos/asteroids` y `/juegos/tetris`: SHOOTER magenta, PUZZLE cian, ARCADE verde (`getComputedStyle().color`); captura `.playwright-screenshots/spec21-cards.png`.
3. **Botón JUGAR AHORA de la ficha.**
   - `className={"btn xl pulse " + game.color}`; keyframe renombrado a `btn-pulse` (colisión con el `pulse` de Tailwind 4, ver nota en Modelo de datos).
   - Verificación: en `/juegos/asteroids` borde magenta, hover magenta y glow del pulse magenta; en `/juegos/snake` verde; otros `.btn.pulse` sin color siguen cian (glow, antes solo parpadeo de opacidad).
4. **Actividad en vivo.**
   - `tk-p` sin `neon-*` y color `--ink` en CSS; `tk-mid` con `neon-<r.color>`.
   - Verificación: Playwright en `/`: todos los `.tk-p` mismo color computado; cada `.tk-mid` en el color de su juego; captura `spec21-actividad.png` (escritorio y 390×844).
5. **Chips del filtro.**
   - `library.tsx`: clase `accent-<CATEGORY_COLOR[c]>` en chips ≠ TODOS.
   - Verificación: `/juegos` chip ARCADE verde, PUZZLE cian, SHOOTER magenta; al activarlo, borde y glow de su color; TODOS activo blanco (`--ink`); pestañas del Salón de la fama siguen magenta; filtrado sin cambios.
6. **Hover de la tarjeta de biblioteca.**
   - `game-card.tsx`: `div.card` con `accent-<game.color>`; `globals.css`: `.card:hover` y `.card::before` con `var(--accent, var(--cyan))` + `color-mix()`.
   - Verificación: Playwright en `/juegos` con hover (`page.hover`) en la tarjeta de Asteroids (borde `rgb(255,0,110)`), Tetris (cian) y Snake (verde); `getComputedStyle(card, '::before').backgroundImage` con el color de su juego; `.mini-card` de la home sigue cian; captura `spec21-hover.png`.
7. **Docs y cierre.**
   - `CLAUDE.md` lista de specs + `README.md`; Estado → Implementado.
   - Verificación: `npx tsc --noEmit`, `npm run lint`, `npm run build` OK.

---

## Criterios de aceptación

- [x] Etiqueta de categoría en tarjeta de biblioteca, mini-card de home y ficha usa el color de su categoría.
- [x] En "Últimas puntuaciones" todos los nombres de usuario tienen el mismo color (`--ink`) y el título del juego usa el color de su categoría.
- [x] "▶ JUGAR AHORA" de la ficha tiene borde, hover y pulse en el color del juego.
- [x] Chips de categoría del filtro en su color; activo con borde y glow de su color; TODOS activo en blanco (no comparte color con ninguna categoría).
- [x] Botones `.btn.pulse` sin clase de color siguen pulsando en cian.
- [x] Hover de la tarjeta de biblioteca (borde, sombra y degradado de esquina) en el color de su categoría.
- [x] Ningún color hardcodeado por juego: todo sale de `game.color` / `CATEGORY_COLOR`.
- [x] `tsc`, `lint`, `build` limpios; CLAUDE.md y README.md mencionan SPEC 21.

---

## Decisiones

- **Sí:** botón de la ficha con borde del color del juego (igual que la tarjeta). Razón: coherencia biblioteca ↔ ficha.
- **Sí:** colorear el título del juego en actividad, no añadir categoría. Razón: cambio mínimo, sin tocar `getRecentScores`.
- **Sí:** usuario en `--ink` (blanco). Razón: neutro, coherente con TOP JUGADORES; el color queda para el juego.
- **Sí:** pulse del color del juego vía `--accent`. Razón: evitar borde de un color con brillo cian.
- **Sí:** variable CSS `--accent` + `.accent-<color>`. Razón: una regla por componente en vez de 11 variantes por selector; reutilizable.
- **Sí:** chips del filtro con color de categoría; TODOS activo en blanco (`--ink`) en vez de magenta. Razón: refuerza la asociación categoría ↔ color y evita dos magentas (SHOOTER y TODOS). Blanco y no `--gold`/`--bronze`, que se parecen a yellow/orange. Clase propia `chip-all` para no tocar `.chip.active` del Salón de la fama.
- **Sí:** hover de la tarjeta de biblioteca en el color de la categoría, reutilizando `--accent`. Razón: coherencia con etiqueta y botón; sin BD ni datos nuevos. `.mini-card` queda fuera (pedido solo para la biblioteca).
- **No:** h2 de la ficha, salón de la fama, HUD. Razón: fuera de lo pedido; spec futura si se quiere.

---

## Riesgos

| Riesgo                                                       | Mitigación                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `silver`/`yellow`/`lime` poco legibles en etiquetas pequeñas | Revisar en captura; ajustar opacidad del borde, no el color              |
| `color-mix()` sin soporte en navegador antiguo               | Fallback: propiedad con color sólido antes de la que usa `color-mix`     |
| Cambiar el keyframe del pulse afecta a otros botones         | Fallback `var(--cyan)` y verificación explícita (criterio de aceptación) |
| Glow del hover demasiado fuerte en `yellow`/`lime`/`silver`  | Revisar en captura; bajar el % de `color-mix()`, no el color             |
| Playwright MCP desconectado                                  | Reintentar; si no, verificación manual y anotarlo                        |
