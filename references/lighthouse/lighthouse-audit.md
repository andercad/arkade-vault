# Auditorías Lighthouse — Estado

> Mantenido por el agente `lighthouse-auditor`. Solo lectura sobre el código. Informes completos en `.lighthouse-reports/` (ignorado por git). Referencias: `specs/25-angular-resto-de-pantallas.md` (deuda a11y aceptada).

## Estado por ruta

| App | Ruta | Device | A11y | BP | SEO | LCP | CLS | TTFB | Elemento LCP | Errores consola | Última revisión |
| --- | ---- | ------ | ---- | -- | --- | --- | --- | ---- | ------------ | --------------- | --------------- |
| angular | `/` | mobile | 100 ✅ | 100 ✅ | 100 ✅ | 2,35 s ✅ / 3,63 s ❌ (2 mediciones) | 0,00 ✅ | 468 / 375 ms | `p.home-sub` (texto, 1ª medición) | 0 | 2026-11-26 |
| angular | `/` | desktop | 100 ✅ | 100 ✅ | 100 ✅ | 1,09 s ✅ | 0,00 ✅ | 351 ms | texto (no consultado) | 0 | 2026-11-26 |
| angular | `/juegos` | mobile | 100 ✅ | 100 ✅ | 100 ✅ | 0,85 s ✅ | 0,00 ✅ | 238 ms | `div.logo-text` (texto) | 0 | 2026-11-26 |
| angular | `/juegos` | desktop | 100 ✅ | 100 ✅ | 100 ✅ | 0,70 s ✅ | 0,00 ✅ | 294 ms | texto (no consultado) | 0 | 2026-11-26 |
| angular | `/juegos/asteroids` | mobile | 95 🟡 | 100 ✅ | 100 ✅ | 1,58 s ✅ | 0,01 ✅ | 340 ms | `div.cover-asteroids` | 0 | 2026-11-26 |
| angular | `/juegos/asteroids` | desktop | 95 🟡 | 100 ✅ | 100 ✅ | 0,55 s ✅ | 0,00 ✅ | 308 ms | texto (no consultado) | 0 | 2026-11-26 |
| angular | `/salon-de-la-fama` | mobile | 96 🟡 | 100 ✅ | 100 ✅ | 1,60 s ✅ | 0,00 ✅ | 406 ms | `p.pixel.hall-sub` (texto) | 0 | 2026-11-26 |
| angular | `/salon-de-la-fama` | desktop | 96 🟡 | 100 ✅ | 100 ✅ | 0,58 s ✅ | 0,00 ✅ | 451 ms | texto (no consultado) | 0 | 2026-11-26 |
| angular | `/about` | mobile | 100 ✅ | 100 ✅ | 100 ✅ | 1,48 s ✅ | 0,00 ✅ | 172 ms | `p.about-mission` (texto) | 0 | 2026-11-26 |
| angular | `/about` | desktop | 95 🟡 | 100 ✅ | 100 ✅ | 0,38 s ✅ | 0,00 ✅ | 40 ms | texto (no consultado) | 0 | 2026-11-26 |
| angular | `/login` | mobile | 95 🟡 | 100 ✅ | 100 ✅ | 4,83 s ❌ / 4,08 s ❌ (2 mediciones) | 0,02 ✅ | 175 ms | `h2.neon-cyan` (texto) | 0 | 2026-11-26 |
| angular | `/login` | desktop | 95 🟡 | 100 ✅ | 100 ✅ | 0,70 s ✅ | 0,01 ✅ | 8 ms | texto (no consultado) | 0 | 2026-11-26 |

Umbrales: A11y/BP/SEO ≥ 90 · LCP ≤ 2,5 s · CLS ≤ 0,1.

### Leyenda de columnas (Estado por ruta)

| Columna | Qué es | Qué valora | Umbral |
| ------- | ------ | ---------- | ------ |
| App | App auditada: `angular` (`:4200`) o `next` (`:3000`) | Origen de la medición | — |
| Ruta | Pantalla auditada (`/`, `/juegos`…) | Pantalla concreta | — |
| Device | `mobile` (390×844, CPU ×4, Fast 4G) o `desktop` (sin throttling) | Perfil de emulación | — |
| A11y | Score Lighthouse de accesibilidad (0-100) | Etiquetas, ARIA, contraste, foco, semántica | ≥ 90 |
| BP | Score de buenas prácticas (0-100) | HTTPS, errores de consola, APIs obsoletas, imágenes, seguridad básica | ≥ 90 |
| SEO | Score de SEO (0-100) | Título, meta description, rastreabilidad, enlaces, viewport | ≥ 90 |
| LCP | Largest Contentful Paint, de la traza | Rapidez con la que se pinta el elemento principal | ≤ 2,5 s |
| CLS | Cumulative Layout Shift, de la traza | Estabilidad visual (saltos de diseño) | ≤ 0,1 |
| TTFB | Time To First Byte, de la traza | Respuesta del servidor/SSR | referencia ≤ 0,8 s |
| Elemento LCP | Nodo que provoca el LCP (selector/tipo) | Qué optimizar primero | — |
| Errores consola | Nº de errores de consola (hidratación, _transfer cache_, red) | Salud de ejecución en cliente | 0 |
| Última revisión | Fecha de la medición (AAAA-MM-DD) | Frescura del dato | — |

Leyenda de marcas: `✅` cumple · `❌` incumple · `🟡` aceptado/parcial (p. ej. deuda a11y de la SPEC 25) · `no verificado` servidor apagado. Dos valores separados por `/` = dos mediciones (varianza).

Notas de medición: dev server (`:4200`, build sin minificar, no producción). Traza mobile con CPU x4 + Fast 4G; desktop sin throttling. Los 🟡 de A11y son solo `color-contrast` de `--ink-faint` (deuda aceptada SPEC 25). `/about` mobile sale 100 frente a 95 en desktop (los nodos de contraste no se marcan en esa pasada). Sin errores ni avisos de consola; hidratación de `/` correcta (20 componentes, 0 omitidos).

## Paridad Next ↔ Angular

No verificado en esta pasada (solo `angular`).

| Ruta | Device | Δ A11y | Δ BP | Δ SEO | Δ LCP | Regresión |
| ---- | ------ | ------ | ---- | ----- | ----- | --------- |

Leyenda: `Δ A11y/BP/SEO` = score Angular − score Next (puntos; negativo = Angular peor) · `Δ LCP` = LCP Angular vs Next (% sobre Next; positivo = Angular más lento) · `Regresión` = `sí` si Angular queda peor que Next por ≥5 puntos de score o ≥20 % de LCP, si no `no`.

## Historial de auditorías

| Fecha y hora | App | Resumen | Abiertos |
| ------------ | --- | ------- | -------- |
| 2026-11-26 (sin hora) | angular | 6 rutas x mobile/desktop. Scores 95-100 (solo contraste aceptado). Peor LCP: `/login` mobile 4,08-4,83 s. `/` mobile 2,35 y 3,63 s (varianza). Consola limpia. | 2 (Medio) |

Leyenda: `Fecha y hora` de lanzamiento de la auditoría (`date "+%Y-%m-%d %H:%M"`) · `App` auditada (`angular`/`next`/`ambas`) · `Resumen` rutas auditadas, peor score y peor LCP · `Abiertos` nº de hallazgos abiertos al cerrar (por severidad Alto/Medio/Bajo).

## Hallazgos abiertos

1. **Medio — LCP de `/login` en mobile 4,08-4,83 s (> 2,5 s).** Evidencia: traza mobile (CPU x4, Fast 4G), 2 mediciones; elemento `h2.neon-cyan` (`angular/src/app/auth/components/auth-form/auth-form.html:8`), TTFB 175 ms, render delay 3,9-4,7 s. La ruta es `RenderMode.Client` (`angular/src/app/app.routes.server.ts:7`): el HTML del servidor no trae el formulario y se pinta tras cargar y ejecutar el JS (dev, sin minificar). Impacto: login lento en móvil de gama baja. Corrección propuesta (sin aplicar): confirmar con build de producción (`npm run build`, sirve con `PORT=4300`); si persiste, valorar `RenderMode.Prerender` para `/login` (es formulario sin datos) o diferir lo que no sea crítico. Sugerencia: `/spec` de rendimiento de login (encaja con SPEC 26).
2. **Medio — LCP de `/` en mobile cerca/por encima del umbral: 2,35 s y 3,63 s (varianza alta).** Evidencia: 2 trazas mobile; elemento `p.home-sub` en la 1ª; render delay 1,9-3,3 s; `styles.css` render-blocking (ahorro estimado 76 ms). Impacto: LCP inestable en móvil. Corrección propuesta (sin aplicar): re-medir con build de producción antes de actuar; si persiste, revisar qué bloquea el primer pintado (CSS global de `app/globals.css`, fuentes `@fontsource`). Sugerencia: `/spec` solo si se confirma en prod build.

Aceptado (no reportado como nuevo): contraste de `--ink-faint` (#4a4f70 sobre #0f0f18, 2,39) en `/juegos/asteroids` (`.stat-strip .l`, `.lb-date`), `/salon-de-la-fama` (`.th`, `.date`, `.dt`), `/about` desktop (labels del formulario) y `/login` (labels, versión, divisor, términos). El `h1` ausente en detalle y login no lo marca Lighthouse.

Última actualización: 2026-11-26
