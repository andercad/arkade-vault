# SPEC 13 — Apariencia Gamepad MK-II del mando táctil

> **Estado:** Implementado
> **Depende de:** SPEC 12 (controles táctiles)
> **Fecha:** 2026-11-17
> **Objetivo:** Rediseñar el mando táctil del reproductor para que replique el aspecto del Gamepad MK-II de `references/gamepad-assets/` (carcasa neón, d-pad con hub y botones A/B), sin cambiar su comportamiento ni el contrato `touchControls`.

---

## Por qué existe esta spec

El mando de SPEC 12 funciona, pero su estética (botones sueltos con borde cian y textos en círculos) no coincide con el diseño de referencia del portal (`references/gamepad-assets/gamepad.html`, `gamepad-neon.png`). Queremos el mismo aspecto: carcasa, cruz con hub y gema pulsante, botones A/B esféricos con brillo y estado pulsado hundido.

---

## Alcance

**Dentro:**

- Carcasa `.gp` completa: degradado oscuro, borde cian, borde interior, textura de puntos, sombra cian. Compactada para seguir cabiendo a 390×844 sin scroll.
- D-pad como la referencia: cruz completa de 4 botones (50 px / 46 px en ≤620 px) + hub central con gema rombo cian pulsante. Las direcciones sin tecla en `touchControls.dpad` se pintan atenuadas y deshabilitadas (no emiten nada).
- Botones de acción redondos estilo A/B: letra `A`/`B` en el botón y el `label` del registro (DISPARO, GIRAR…) como rótulo pequeño debajo. `actions[0]` → A magenta (extremo derecho), `actions[1]` → B cian (a su izquierda). Con 1 acción solo A; con 0 acciones la columna derecha queda vacía (Snake).
- Estado pulsado (`.on` / `:active`): hundido, brillo neón, anillo discontinuo, como la referencia.
- Iluminar el botón (`.on`) cuando se pulsa la tecla física correspondiente (`keydown`/`keyup` reales en `window`, por `e.code`, solo códigos presentes en `touchControls`). No se ilumina con el mando `disabled`.
- Reutilizar tokens existentes de `globals.css` (`--cyan`, `--magenta`, `--line`, `--ink-dim`, `--pixel`); sin Google Fonts nuevas (la fuente pixel ya llega por `next/font`).
- `CLAUDE.md` y `README.md`: mencionar spec 13 y el aspecto MK-II.

**Fuera de alcance:**

- Mostrar el mando en escritorio (sigue solo `pointer: coarse`).
- Cambios en `TouchControls`/`GameDefinition`, en el registro, en motores, en `game-player.tsx` o en la emisión de teclas (multitouch, liberación, `disabled` siguen igual).
- Hover del mando (no aplica en táctil), mapeo WASD/Z/X de la referencia, Gamepad API, háptica.
- Skins del mando por juego.

---

## Modelo de datos

Sin datos nuevos. Se mantiene `TouchControls` de SPEC 12. Mapeo visual derivado en el componente:

| Origen               | Visual                                   |
| -------------------- | ---------------------------------------- |
| `dpad[dir]` definido | flecha activa                            |
| `dpad[dir]` ausente  | flecha atenuada + `disabled`, sin emitir |
| `actions[0]`         | botón `A` magenta + rótulo `label`       |
| `actions[1]`         | botón `B` cian + rótulo `label`          |

---

## Plan de implementación

1. **Marcado del componente:** `components/touch-controls.tsx` → carcasa `.gp` > `.gp-body` > columna izquierda (d-pad 4 flechas + `.dp-hub` con gema) y derecha (`.gp-actions`, B a la izquierda de A, rótulo bajo cada botón). Direcciones sin código: `disabled` permanente. Lógica de `PadButton` intacta. Usar `/frontend-design`.
   - **Verificación:** `npm run lint` OK. Playwright táctil 390×844 en Tetris: snapshot con 4 flechas (↑ `disabled`), hub, botones A (GIRAR) y B (BAJAR) con sus rótulos; pulsar ← mueve la pieza. Arkanoid: solo A (LANZAR). Snake: sin columna de acciones, sin errores en consola.
2. **CSS MK-II:** sustituir el bloque `.touch-controls`/`.tc-*` de `app/globals.css` por los estilos de la referencia adaptados (prefijo propio, tokens del proyecto, `touch-action: none` y anti-callout conservados, visible solo `pointer: coarse`, gema sin animación con `prefers-reduced-motion`). Ajustar el alto reservado en `.crt { --game-h }` si la carcasa ocupa más.
   - **Verificación:** captura 390×844 táctil de los 4 juegos en `.playwright-screenshots/` comparada con `gamepad-neon.png` (carcasa, cruz, hub, A magenta a la derecha, B cian). `document.documentElement.scrollHeight <= innerHeight` y `scrollWidth <= innerWidth` vía `browser_evaluate`. Captura con un botón en `:active`/pulsado (hundido + brillo). Escritorio 1280×800 (`pointer: fine`): mando no visible. Horizontal 844×390: sin desborde horizontal.
3. **Iluminación por teclado físico:** en `touch-controls.tsx`, listener `keydown`/`keyup` en `window` que marque `.on` en el botón con ese `code` (ignorar `e.repeat`; limpiar en `blur`, al desmontar y cuando `disabled`). Los eventos sintéticos del propio mando no deben duplicar estado (filtrar por `isTrusted` solo aquí, nunca en motores).
   - **Verificación:** Playwright táctil en Asteroids: `browser_press_key` (keydown real) ArrowLeft/Space → botón ← / A con clase `.on`; tras soltar, sin `.on`. Con el juego en pausa o modal de fin, pulsar teclas no añade `.on`. Tocar el botón A en pantalla no deja `.on` pegada al soltar. Lint OK.
4. **Regresión SPEC 12 con Playwright MCP:** emulación táctil 390×844 en los 4 juegos + escritorio.
   - **Verificación:** recorrer todos los criterios de aceptación de esta spec y los de SPEC 12 (multitouch ← + ↑ + A en Asteroids, sin tecla pegada al arrastrar fuera, inactivo en pausa/fin, teclado de escritorio igual). `npm run lint` y `npm run build` sin errores.
5. **Docs:** `CLAUDE.md`, `README.md`; Estado → Implementado; marcar criterios.
   - **Verificación:** `CLAUDE.md` y `README.md` mencionan SPEC 13 de forma coherente entre sí; todos los criterios marcados `[x]`.

Un commit por paso (`13-gamepad-mk2: Paso N`).

---

## Criterios de aceptación

- [x] A 390×844 táctil el mando muestra carcasa, cruz completa con hub y gema pulsante, y botones A/B esféricos como en `gamepad-neon.png`.
- [x] Arkanoid muestra ↑/↓ atenuados; pulsarlos no emite teclas. Tetris ↑ atenuado; Asteroids ↓ atenuado; Snake 4 activas.
- [x] Asteroids/Arkanoid: solo botón A (magenta) con rótulo DISPARO/LANZAR. Tetris: A=GIRAR, B=BAJAR. Snake: sin botones de acción, sin error.
- [x] Pulsar un botón lo hunde e ilumina; al soltar vuelve al estado normal.
- [x] Con teclado físico, pulsar ←/Espacio ilumina el botón correspondiente; al soltar se apaga. En pausa/fin no se ilumina.
- [x] Todo el comportamiento de SPEC 12 sigue igual (multitouch, sin tecla pegada, inactivo en pausa/fin, sin scroll/zoom/selección/menú contextual).
- [x] A 390×844 vertical HUD + canvas + mando caben sin scroll vertical ni horizontal; en horizontal nada desborda.
- [x] En escritorio (`pointer: fine`) el mando no se muestra.
- [x] `npm run lint` y `npm run build` sin errores.

---

## Decisiones

- **Sí:** letra A/B + rótulo del registro debajo. Fiel a la referencia sin perder qué hace cada botón.
- **No:** solo letra (hay que adivinar la acción) ni texto dentro del círculo (rompe el diseño).
- **Sí:** `actions[0]` = A magenta a la derecha, `actions[1]` = B cian. Coincide con la referencia y no cambia el registro. (Pregunta sin respuesta explícita; se aplica la recomendada.)
- **Sí:** cruz completa con direcciones sin uso atenuadas. Mantiene la silueta de la referencia.
- **No:** ocultar direcciones sin uso (cruz con huecos).
- **Sí:** iluminar con teclado físico (tablets con teclado BT).
- **No:** mostrar en escritorio; se mantiene la regla de SPEC 12.
- **Sí:** en móvil vertical (≤620 px) el mando va `position: fixed` al borde inferior, sin leyenda del marco ni pie de página, para que el canvas ocupe el alto libre (a 390×844 el canvas pasó de ~200 a ~440 px de alto). Añadido tras probar el Paso 2: reservar la altura del mando dejaba el juego diminuto. Evidencia: `.playwright-screenshots/13-mobile-fix-*.png`.
- **Sí:** guard `disabled` en `onPointerDown` (los hijos svg/span del botón reciben pointerdown aunque esté deshabilitado).
- **Sí:** tokens y fuente del proyecto; no se importa el `<style>`/fuentes de Google tal cual.

---

## Riesgos

| Riesgo                                                           | Mitigación                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| La carcasa (padding, sombras) añade alto y obliga a hacer scroll | Padding compacto en `pointer: coarse` y reajustar `--game-h` de `.crt`.      |
| El rótulo bajo A/B ensancha la columna derecha en 390 px         | Fuente pixel 7-8 px, `white-space: nowrap`, ancho máximo igual al botón+gap. |
| Doble iluminación/estado pegado entre `.on` y `:active`          | `.on` solo por teclas `isTrusted`; limpiar en `blur`/desmontar/`disabled`.   |
| Animación de la gema consume batería                             | Respetar `prefers-reduced-motion` (sin animación).                           |

---

## Qué **no** hay en esta spec

- Mando en escritorio, cambios de contrato/registro/motores, Gamepad API, háptica, skins del mando.
