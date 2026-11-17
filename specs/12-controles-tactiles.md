# SPEC 12 — Controles táctiles para jugar en móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 07 (registro genérico de juegos), SPEC 10 (HUD del reproductor), SPEC 11 (reset del reproductor)
> **Fecha:** 2026-11-17
> **Objetivo:** Permitir jugar los 4 juegos en un móvil táctil en vertical con un mando en pantalla bajo el canvas, configurado por juego en el registro, que emite teclas virtuales a los motores.

---

## Por qué existe esta spec

Los motores solo leen teclado (`keydown`/`keyup` en `window`, `e.code`). En móvil no hay teclado: el reproductor muestra "REQUIERE TECLADO" y no se puede jugar. Además el HUD envuelve en varias filas y empuja el canvas fuera de pantalla (ver `references/idea-canvas-controls.png`).

---

## Alcance

**Dentro:**

- Tipos `TouchControls` en `lib/game-engine.ts` y campo opcional `touchControls` en `GameDefinition` (`lib/game-registry.ts`), rellenado para Asteroids, Tetris, Arkanoid y Snake.
- Componente nuevo `components/touch-controls.tsx`: d-pad a la izquierda + botones de acción a la derecha, debajo del canvas, renderizado por `components/game-player.tsx` de forma genérica.
- Cada botón: `pointerdown` → `window.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true }))`; `pointerup`/`pointercancel`/`pointerleave` → `keyup`. Multitouch (varios botones a la vez). Sin autorepetición.
- Sin efectos de navegador en el mando: `touch-action: none`, sin selección de texto, sin menú contextual en pulsación larga, sin zoom por doble toque, los botones no toman foco.
- Visible solo con `@media (pointer: coarse)`; en escritorio no aparece. Sustituye el aviso `.keyboard-notice` "REQUIERE TECLADO" (se elimina).
- HUD compacto en móvil (`globals.css`, `pointer: coarse` / ancho ≤ 520 px): stats en una fila con texto menor, selector de skin y PAUSA/FIN/SALIR compactos, para que HUD + canvas + mando quepan a ~390×844 sin scroll vertical.
- Mando inactivo (sin emitir teclas) cuando el juego está en pausa o con el modal de fin abierto.
- `next.config.ts`: `allowedDevOrigins` desde env `ALLOWED_DEV_ORIGINS` (lista separada por comas, vacío por defecto) para probar `npm run dev` desde el móvil en la LAN; documentado en README.
- `/add-game` (`.claude/skills/add-game/template.md` y `checklist.md`): añadir `touchControls` al alta de juego.
- Actualizar `CLAUDE.md` y `README.md` (spec 12, mando táctil, `touchControls`, prueba en LAN).

**Fuera de alcance:**

- Gestos (swipe/tap) y arrastre sobre el canvas (incluida la pala de Arkanoid con el dedo).
- Autorepetición al mantener pulsado (Tetris).
- Layout dedicado en horizontal (solo debe no romperse).
- Vibración/háptica, personalización o reubicación del mando, mandos físicos (Gamepad API).
- Cambios en motores, BD o `GameCanvas`.

---

## Modelo de datos

Sin datos en BD. Contrato nuevo en `lib/game-engine.ts`:

```ts
export type TouchDirection = "up" | "down" | "left" | "right";

export interface TouchButton {
  code: string; // KeyboardEvent.code que emite: "Space", "ArrowUp"
  label: string; // texto del botón: "DISPARO"
}

export interface TouchControls {
  dpad: Partial<Record<TouchDirection, string>>; // dirección → code; solo las que usa el juego
  actions: TouchButton[]; // 0-2 botones a la derecha
}
```

`GameDefinition.touchControls?: TouchControls`. Sin `touchControls` → no se pinta mando.

| Juego     | dpad                                                       | actions                                |
| --------- | ---------------------------------------------------------- | -------------------------------------- |
| asteroids | left/right `ArrowLeft`/`ArrowRight`, up `ArrowUp` (empuje) | `DISPARO` → `Space`                    |
| tetris    | left/right/down `ArrowLeft`/`ArrowRight`/`ArrowDown`       | `GIRAR` → `ArrowUp`, `CAÍDA` → `Space` |
| arkanoid  | left/right `ArrowLeft`/`ArrowRight`                        | `LANZAR` → `Space`                     |
| snake     | up/down/left/right `Arrow*`                                | —                                      |

---

## Plan de implementación

1. **Contrato y registro:** tipos en `lib/game-engine.ts`, campo `touchControls` en `GameDefinition` y valores de la tabla para los 4 juegos. Sin UI todavía; sistema funcional igual que antes.
2. **Componente `TouchControls`:** `components/touch-controls.tsx` con d-pad + acciones, emisión de `keydown`/`keyup` sintéticos, multitouch, liberación de teclas en `pointercancel`/`pointerleave` y al desmontar, prop `disabled`. Usar `/frontend-design` para el diseño (estética arcade del proyecto).
3. **Integración en el reproductor:** `game-player.tsx` lo pinta bajo el canvas con `definition.touchControls`, `disabled` en pausa/fin; eliminar `.keyboard-notice`. CSS en `globals.css`: visible solo con `pointer: coarse`, `touch-action: none`, sin selección/callout.
4. **HUD compacto en móvil:** reglas en `globals.css` para que HUD + canvas + mando quepan a ~390×844 sin scroll.
5. **Dev en LAN:** `allowedDevOrigins` desde `ALLOWED_DEV_ORIGINS` en `next.config.ts`; sección en README.
6. **Verificación con Playwright MCP:** emulación táctil (`hasTouch`, `isMobile`, 390×844) en los 4 juegos; capturas en `.playwright-screenshots/`. Prueba en móvil real por LAN si está disponible.
7. **Docs y skill:** `/add-game` template + checklist, `CLAUDE.md`, `README.md`; Estado → Implementado.

Un commit por paso (`12-controles-tactiles: Paso N`).

---

## Criterios de aceptación

- [ ] Con emulación táctil a 390×844, el mando aparece bajo el canvas en los 4 juegos y no aparece "REQUIERE TECLADO".
- [ ] En escritorio (`pointer: fine`) el mando no se muestra y el teclado funciona igual que antes.
- [ ] Asteroids: girar, empujar y disparar con el mando; mantener ← + ↑ + DISPARO a la vez funciona.
- [ ] Tetris: mover, bajar, girar y caída rápida con el mando; un toque = un paso.
- [ ] Arkanoid: mover la pala manteniendo ←/→ y lanzar la bola con LANZAR.
- [ ] Snake: cambiar de dirección con las 4 flechas.
- [ ] Al levantar el dedo o salir del botón arrastrando, la acción se detiene (no queda tecla "pegada").
- [ ] En pausa o con el modal de fin abierto, el mando no altera el juego.
- [ ] Pulsar el mando no hace scroll, zoom, selección de texto ni menú contextual.
- [ ] A 390×844 en vertical HUD + canvas + mando caben sin scroll vertical ni horizontal; en horizontal nada desborda horizontalmente.
- [ ] Un juego sin `touchControls` en el registro no pinta mando ni da error.
- [ ] Con `ALLOWED_DEV_ORIGINS=<ip>` se puede abrir `npm run dev` desde el móvil en la LAN; sin la variable, el comportamiento es el actual.
- [ ] `npm run lint` y `npm run build` sin errores.

---

## Decisiones

- **Sí:** teclas virtuales (`KeyboardEvent` sintéticos en `window`). Cero cambios en motores; cualquier juego que lea teclado gana soporte táctil.
- **No:** método `input()` nuevo en `GameEngine`. Más limpio, pero obliga a tocar los 4 motores.
- **No:** gestos swipe/tap. Malos para mantener pulsado (Asteroids, Arkanoid).
- **Sí:** configuración por juego en `GAME_REGISTRY` (`touchControls`). UI genérica sin ramas por juego; solo los botones que el juego usa.
- **No:** layout fijo único para todos. Botones sin uso confunden.
- **Sí:** mando debajo del canvas, solo con `pointer: coarse`. No tapa el juego.
- **No:** superpuesto al canvas (idea de la imagen) ni toggle manual.
- **Sí:** HUD compacto en móvil, para que todo quepa en vertical.
- **Sí:** multitouch sin autorepetición. Fiel al teclado (Tetris ya es un paso por pulsación).
- **Sí:** solo vertical como objetivo; horizontal sin layout propio.
- **Sí:** `allowedDevOrigins` por env, no IP fija en el repo (cada red es distinta).

---

## Riesgos

| Riesgo                                                                | Mitigación                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Un motor futuro filtra `e.isTrusted` y ignora las teclas sintéticas   | Documentarlo en el checklist de `/add-game`: los motores no deben filtrar `isTrusted`.                       |
| Tecla pegada si se pierde `pointerup` (cambio de app, rotación)       | Liberar en `pointercancel`/`pointerleave`/`lostpointercapture`, al desmontar y en `blur`/`visibilitychange`. |
| HUD + canvas + mando no caben en móviles más bajos que 844 px         | Canvas con `max-height` en vh dentro del media query; aceptar scroll mínimo bajo ~700 px.                    |
| Emulación de Playwright no reproduce todo (callout iOS, doble toque)  | Probar en móvil real por LAN (paso 5).                                                                       |
| `cacheComponents` conserva el mando entre visitas con teclas pulsadas | Liberar todas las teclas en el cleanup del efecto (mismo patrón que el reset de SPEC 11).                    |

---

## Qué **no** hay en esta spec

- Gestos o arrastre sobre el canvas.
- Autorepetición, háptica, mando configurable, Gamepad API.
- Layout apaisado dedicado.
- Cambios en motores o BD.
