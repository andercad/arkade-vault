# SPEC 02 — Homepage y mover la Biblioteca a /juegos

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-10
> **Objetivo:** Implementar la Home (landing) de `references/templates/home-about/` en `/`, mover la Biblioteca actual a `/juegos` y completar la nav con "Inicio" y "Acerca de" (sin página About).

---

## Por qué existe esta spec

En SPEC 01 `/` es la Biblioteca. El nuevo prototipo (`references/templates/home-about/`) añade una landing de marketing en `/` y deja la biblioteca como destino secundario. Hay que portar solo la Home; About queda para otra spec, pero su link ya aparece en la nav.

---

## Alcance

**Dentro:**

- Nueva Home en `/` (Server Component + piezas cliente) portada de `home.jsx`, con las secciones:
  - Hero: eyebrow, título 3 líneas, subtítulo, CTAs "EXPLORAR JUEGOS" (→ `/juegos`) y "CREAR CUENTA" (→ `/login`), indicador "DESLIZA", 8 siluetas SVG flotantes.
  - `// 01` ¿POR QUÉ ARCADE VAULT?: 4 feature cards con icono SVG pixel.
  - `// 02` JUEGOS DISPONIBLES AHORA: rail de 6 mini-cards (`GAMES.slice(0, 6)`) → `/juegos/[id]`, botón "VER TODOS LOS JUEGOS →" → `/juegos`.
  - Bloque de stats (3 bloques).
  - `// 03` ACTIVIDAD EN VIVO: "ÚLTIMAS PUNTUACIONES" (7 filas) y "TOP JUGADORES · HOY" (5 filas, link "VER SALÓN →" → `/salon-de-la-fama`).
  - `// 04` PRECIOS: price card ("EMPEZAR GRATIS →" → `/login`) y 3 FAQ.
  - CTA final "¿LISTO PARA JUGAR?" con "INSERTAR MONEDA →" → `/juegos`.
- Animación `reveal` al hacer scroll (IntersectionObserver, clase `in`).
- Mover la Biblioteca actual (`<Library />`) a `app/juegos/page.tsx`, ruta `/juegos`.
- Nav (escritorio y móvil): `Inicio` (`/`), `Biblioteca` (`/juegos`), `Salón de la Fama`, `Acerca de` (`/about`). Reglas de activo:
  - Inicio: solo en `/`.
  - Biblioteca: `/juegos` y `/juegos/*`.
  - Salón: `/salon-de-la-fama`.
  - Acerca de: `/about*`.
- Actualizar enlaces existentes que apuntaban a la biblioteca en `/`: "VOLVER AL VAULT" (detalle), enlaces de `game-player.tsx` y `hall-of-fame.tsx`. Los redirects tras login (`auth-form.tsx`) siguen yendo a `/` (Home).
- Portar a `app/globals.css` los estilos de la Home desde `references/templates/home-about/styles.css` (líneas ~933 en adelante: `home-*`, `feature-*`, `mini-*`, `stat-*`, `activity-*`, `ticker`, `top-*`, `pricing-*`, `price-*`, `faq-*`, `home-final`, `reveal`, `silo`), sin duplicar clases ya presentes.
- Datos mock de la Home tipados en `lib/home.ts`.

**Fuera de alcance (specs futuras):**

- Página About (`/about`): el link existe y da 404 hasta su spec.
- Datos reales para "Actividad en vivo" / "Top jugadores" (siguen mock y estáticos, sin actualización).
- Leer `av_scores` o la sesión para personalizar la Home (p. ej. ocultar "CREAR CUENTA" con sesión iniciada).
- Redirección de `/` → `/juegos` o de rutas antiguas; no hay tráfico previo que preservar.
- Renombrar `/juegos/[id]` y `/juegos/[id]/jugar` a `/games/...` (se quedan como están).
- Cualquier cambio en el reproductor, auth, salón o detalle más allá de los enlaces.
- Tests automatizados, i18n.

---

## Modelo de datos

```ts
// lib/home.ts
import type { AccentColor } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;
  desc: string;
  color: AccentColor;
}

export interface HomeStat {
  n: string;   // "12+", "MILES", "GLOBAL"
  u: string;   // "JUEGOS", ...
  s: string;   // "Y CONTANDO", ...
}

export interface RecentScore {
  player: string;
  game: string;      // título tal cual en el template ("Caída", "Glotón", ...)
  score: number;
  when: string;      // "hace 2 min"
  color: AccentColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];        // 4
export const HOME_STATS: HomeStat[];     // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];   // 5
export const PRICING_FEATURES: string[]; // 6 ítems de la lista del plan
export const FAQ: FaqItem[];             // 3
```

No se introduce persistencia nueva. Se reutilizan `GAMES` (`lib/games.ts`) y `AuthProvider` (`lib/auth.tsx`) de SPEC 01.

Convenciones:

- Copy, emojis/símbolos (`▸`, `✔`, `→`) y mayúsculas idénticos al template.
- Números con `toLocaleString("es-ES")`.
- Retardos de animación como en el template: features `i * 80ms`, stats `i * 90ms`, ticker `i * 60ms`.

---

## Plan de implementación

1. Crear `lib/home.ts` con los tipos y las constantes copiadas de `home.jsx`. Verificación: `npx tsc --noEmit` pasa.
2. Portar los estilos de la Home a `app/globals.css`. Verificación: `npm run build` pasa; sin colisiones con clases existentes.
3. Mover la Biblioteca: crear `app/juegos/page.tsx` con `<Library />` y actualizar enlaces que apuntaban a `/` como biblioteca (`app/juegos/[id]/page.tsx`, `components/game-player.tsx`, `components/hall-of-fame.tsx`). Verificación: `/juegos` muestra las 8 tarjetas; "VOLVER AL VAULT" lleva a `/juegos`.
4. Actualizar `components/nav.tsx`: añadir "Inicio" y "Acerca de" en escritorio y panel móvil, y reglas de activo nuevas. Verificación: "Inicio" activo solo en `/`; "Biblioteca" en `/juegos*`; el logo lleva a `/`.
5. Crear componentes de la Home: `components/home/silhouettes.tsx`, `components/home/feature-icon.tsx`, `components/home/mini-card.tsx` (Server Components, `Link`) y `components/home/reveal.tsx` (cliente, IntersectionObserver). Además, un componente Server por cada sección envuelta en `Reveal`, que incluye su propio `<Reveal>`: `features-section.tsx` (`// 01`), `games-section.tsx` (`// 02`), `stats-section.tsx`, `activity-section.tsx` (`// 03`), `pricing-section.tsx` (`// 04`) y `final-cta-section.tsx`. El hero no usa `Reveal` y se queda en `app/page.tsx`. Verificación: compilan aisladamente (`tsc`).
6. Reemplazar `app/page.tsx` por la Home: hero inline y composición de los 6 componentes de sección del paso 5, con `"use client"` solo en el wrapper de `reveal`. Verificación: `/` muestra las 6 secciones con el aspecto del template y las animaciones `reveal`.
7. Verificar enlaces y estados: CTAs, mini-cards, "VER SALÓN →", `/about` (404), responsive (breakpoints 980/520 de los grids). Ajustar `metadata` de `/` si procede. Verificación: `npm run lint` y `npm run build` pasan.

Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` (Link, usePathname, Server vs Client Components), según `AGENTS.md`. Para el diseño visual aplicar `/frontend-design`, según `CLAUDE.md`.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` carga sin errores en la consola del navegador y muestra: hero, `// 01`, `// 02`, stats, `// 03`, `// 04` y CTA final.
- [ ] El hero muestra el título en 3 líneas ("EL ARCADE", "CLÁSICO ESTÁ", "DE VUELTA") y 8 siluetas SVG.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" llevan a `/juegos`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" llevan a `/login`.
- [ ] "VER SALÓN →" lleva a `/salon-de-la-fama`.
- [ ] El rail muestra exactamente 6 mini-cards; clic en una lleva a `/juegos/[id]` del juego correcto.
- [ ] "ÚLTIMAS PUNTUACIONES" muestra 7 filas y "TOP JUGADORES · HOY" 5 filas, las 3 primeras con clases `top1`/`top2`/`top3`.
- [ ] Las secciones con clase `reveal` reciben la clase `in` al entrar en el viewport.
- [ ] `/juegos` muestra la Biblioteca con 8 tarjetas; el chip "SHOOTER" deja 2 y buscar "zzz" muestra "NO HAY RESULTADOS".
- [ ] El detalle `/juegos/bloque-buster` y el reproductor siguen funcionando; "VOLVER AL VAULT" lleva a `/juegos`.
- [ ] La nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de" en escritorio y en el panel móvil.
- [ ] "Inicio" activo solo en `/`; "Biblioteca" activa en `/juegos` y `/juegos/*`; "Salón de la Fama" activa en `/salon-de-la-fama`.
- [ ] "Acerca de" lleva a `/about`, que responde 404.
- [ ] Tras login/registro/invitado se redirige a `/` y la Home se renderiza correctamente.
- [ ] No hay hydration warnings al recargar `/` con sesión guardada.
- [ ] En ancho ≤ 980px los feature-grid pasan a 2 columnas y en ≤ 520px a 1 columna.

---

## Decisiones

- **Sí:** la Biblioteca va a `/juegos` y no a `/games`. Coherente con las rutas en español de SPEC 01 (`/juegos/[id]`, `/salon-de-la-fama`).
- **No:** renombrar el detalle y el reproductor a `/games/[id]`. Cambio masivo sin valor; el usuario pidió mantenerlos.
- **Sí:** link "Acerca de" apunta a `/about` aunque dé 404. Deja la nav completa como el template; el 404 es temporal hasta la spec de About.
- **No:** página placeholder ni link deshabilitado para About. Añade una ruta o un estado que no se pidió.
- **Sí:** nav "Inicio · Biblioteca · Salón · Acerca de" con los textos del template.
- **No:** renombrar "Biblioteca" a "Juegos". Se mantiene el copy del prototipo.
- **Sí:** datos mock en `lib/home.ts` tipados, como `lib/games.ts`. Separa datos de UI.
- **No:** arrays inline en el JSX como el template. Mezcla datos y presentación.
- **Sí:** Home como Server Component; `"use client"` solo para `reveal` (IntersectionObserver). Menos JS en cliente.
- **Sí:** un componente por cada sección envuelta en `Reveal` (`components/home/*-section.tsx`), cada uno con su `<Reveal>` y sus datos de `lib/home.ts`/`lib/games.ts`. `app/page.tsx` solo compone. Archivos pequeños y secciones aisladas.
- **No:** componente propio para el hero. No usa `Reveal` y no se pidió.
- **Sí:** fidelidad 1:1 con el template (copy, animaciones, CTAs). Los botones `navigate()` se convierten en `Link` con la ruta real.
- **Sí:** redirects de login a `/` (la Home). Es el comportamiento natural de un landing.
- **No:** personalizar la Home según sesión. Mejora futura.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Clases CSS de la Home ausentes en `globals.css` (confirmado: no están) | Portarlas del `styles.css` del template en el paso 2; verificar visualmente. |
| Colisión de nombres entre CSS portado y existente | Revisar antes de pegar; no duplicar reglas ya presentes. |
| `.reveal` oculta secciones si el JS no corre o el observer falla | El wrapper cliente añade `in`; fallback: verificar con Playwright que las 6 secciones acaban visibles. |
| Hydration mismatch en `reveal` | Añadir `in` solo en el efecto; render inicial determinista. |
| Link `/about` da 404 visible al usuario | Decisión aceptada; se resuelve en la spec de About. |
| Enlaces a `/` como biblioteca olvidados en otros componentes | Grep de `href="/"` tras el cambio (hoy: `game-player.tsx`, `hall-of-fame.tsx`, `juegos/[id]/page.tsx`). |
| `app/layout.tsx` envuelve children en `<div id="root">` con `height: 100%` y el hero usa alturas de viewport | Verificar scroll y footer visualmente en la Home. |

---

## Qué **no** está en esta spec

- Página About (`/about`).
- Cambio de rutas de detalle o reproductor a `/games/...`.
- Datos reales o dinámicos en la Home (actividad, ranking, stats).
- Personalización de la Home por sesión.
- Tests automatizados, i18n, SEO avanzado.

Cada uno, si llega, va en su propia spec.
