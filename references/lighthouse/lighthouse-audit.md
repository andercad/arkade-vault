# Auditorías Lighthouse — Estado

> Mantenido por el agente `lighthouse-auditor`. Solo lectura sobre el código. Informes completos en `.lighthouse-reports/` (ignorado por git). Referencias: `specs/25-angular-resto-de-pantallas.md` (deuda a11y aceptada).

## Estado por ruta

Última medición: 2026-11-27 14:26 (SPEC 27, paso 4). Angular = staging `https://arkade-vault-eight.vercel.app`; Next = producción `https://arkade-vault-nextjs.vercel.app` (ambos públicos, sin `PERF_BYPASS`). Sin servidores locales.

| App | Ruta | Device | A11y | BP | SEO | LCP | CLS | TTFB | Elemento LCP | Errores consola | Última revisión |
| --- | ---- | ------ | ---- | -- | --- | --- | --- | ---- | ------------ | --------------- | --------------- |
| angular | `/` | mobile | 100 ✅ | 100 ✅ | 60 ❌ (noindex staging) | 2,08 s ✅ | 0,05 ✅ | 170 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/` | desktop | 100 ✅ | 100 ✅ | 60 ❌ (noindex staging) | 1,51 s ✅ | 0,00 ✅ | 36 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/juegos` | mobile | 100 ✅ | 100 ✅ | 60 ❌ (noindex staging) | 2,12 s ✅ | 0,00 ✅ | 170 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/juegos` | desktop | 100 ✅ | 100 ✅ | 60 ❌ (noindex staging) | 1,21 s ✅ | 0,00 ✅ | 34 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/juegos/asteroids` | mobile | 95 🟡 | 100 ✅ | 60 ❌ (noindex staging) | 2,29 s ✅ / 3,15 s ❌ (2 mediciones) | 0,00 ✅ | 170 / 173 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/juegos/asteroids` | desktop | 95 🟡 | 100 ✅ | 60 ❌ (noindex staging) | 1,35 s ✅ | 0,00 ✅ | 37 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/salon-de-la-fama` | mobile | 96 🟡 | 100 ✅ | 60 ❌ (noindex staging) | 2,14 s ✅ / 2,02 s ✅ (2 mediciones) | 0,20 ❌ / 0,20 ❌ | 175 / 172 ms | `div.logo-text.neon-cyan` (texto) | 0 | 2026-11-27 |
| angular | `/salon-de-la-fama` | desktop | 96 🟡 | 100 ✅ | 60 ❌ (noindex staging) | 1,23 s ✅ | 0,00 ✅ | 37 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/about` | mobile | 100 ✅ | 100 ✅ | 60 ❌ (noindex staging) | 1,67 s ✅ | 0,06 ✅ | 171 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/about` | desktop | 95 🟡 | 100 ✅ | 60 ❌ (noindex staging) | 0,72 s ✅ | 0,00 ✅ | 36 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/login` | mobile | 95 🟡 | 100 ✅ | 60 ❌ (noindex staging) | 5,11 s ❌ / 2,40 s ✅ (2 mediciones) | 0,02 ✅ | 172 / 171 ms | texto (no consultado) | 0 | 2026-11-27 |
| angular | `/login` | desktop | 95 🟡 | 100 ✅ | 60 ❌ (noindex staging) | 0,89 s ✅ | 0,01 ✅ | 36 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/` | mobile | 100 ✅ | 100 ✅ | 100 ✅ | 1,87 s ✅ | 0,01 ✅ | 171 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/` | desktop | 100 ✅ | 100 ✅ | 100 ✅ | 0,62 s ✅ | 0,00 ✅ | 44 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/juegos` | mobile | 100 ✅ | 100 ✅ | 100 ✅ | 1,01 s ✅ | 0,09 ✅ | 173 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/juegos` | desktop | 100 ✅ | 100 ✅ | 100 ✅ | 0,23 s ✅ | 0,08 ✅ | 35 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/juegos/asteroids` | mobile | 95 🟡 | 100 ✅ | 100 ✅ | 3,26 s ❌ | 0,05 ✅ | 170 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/juegos/asteroids` | desktop | 95 🟡 | 100 ✅ | 100 ✅ | 1,49 s ✅ | 0,06 ✅ | 36 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/salon-de-la-fama` | mobile | 95 🟡 | 100 ✅ | 100 ✅ | 0,96 s ✅ | 0,01 ✅ | 173 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/salon-de-la-fama` | desktop | 95 🟡 | 100 ✅ | 100 ✅ | 0,44 s ✅ | 0,00 ✅ | 42 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/about` | mobile | 100 ✅ | 100 ✅ | 100 ✅ | 1,90 s ✅ | 0,01 ✅ | 171 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/about` | desktop | 96 🟡 | 100 ✅ | 100 ✅ | 0,71 s ✅ | 0,00 ✅ | 48 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/login` | mobile | 95 🟡 | 100 ✅ | 100 ✅ | 2,44 s ✅ | 0,01 ✅ | 173 ms | texto (no consultado) | 0 | 2026-11-27 |
| next | `/login` | desktop | 95 🟡 | 100 ✅ | 100 ✅ | 0,64 s ✅ | 0,00 ✅ | 35 ms | texto (no consultado) | 0 | 2026-11-27 |

Umbrales: A11y/BP/SEO ≥ 90 · LCP ≤ 2,5 s · CLS ≤ 0,1.

### Leyenda de columnas (Estado por ruta)

| Columna | Qué es | Qué valora | Umbral |
| ------- | ------ | ---------- | ------ |
| App | App auditada: `angular` (`:4200` o staging) o `next` (`:3000` o producción) | Origen de la medición | — |
| Ruta | Pantalla auditada (`/`, `/juegos`…) | Pantalla concreta | — |
| Device | `mobile` (390×844, CPU ×4, Fast 4G) o `desktop` (sin throttling) | Perfil de emulación | — |
| A11y | Score Lighthouse de accesibilidad (0-100) | Etiquetas, ARIA, contraste, foco, semántica | ≥ 90 |
| BP | Score de buenas prácticas (0-100) | HTTPS, errores de consola, APIs obsoletas, imágenes, seguridad básica | ≥ 90 |
| SEO | Score de SEO (0-100) | Título, meta description, rastreabilidad, enlaces, viewport | ≥ 90 |
| LCP | Largest Contentful Paint, de la traza | Rapidez con la que se pinta el elemento principal | ≤ 2,5 s |
| CLS | Cumulative Layout Shift, de la traza | Estabilidad visual (saltos de diseño) | ≤ 0,1 |
| TTFB | Time To First Byte, de la traza | Respuesta del servidor/SSR | referencia ≤ 0,8 s |
| Elemento LCP | Nodo que provoca el LCP (selector/tipo) | Qué optimizar primero | — |
| Errores consola | Nº de errores/avisos de consola (hidratación, _transfer cache_, red) | Salud de ejecución en cliente | 0 |
| Última revisión | Fecha de la medición (AAAA-MM-DD) | Frescura del dato | — |

Leyenda de marcas: `✅` cumple · `❌` incumple · `🟡` aceptado/parcial (p. ej. deuda a11y de la SPEC 25) · `no verificado` servidor apagado. Dos valores separados por `/` = dos mediciones (varianza).

Notas de medición (2026-11-27): despliegues de Vercel (build de producción), no dev server. TTFB desktop 34-48 ms; mobile ~170 ms es la latencia de Fast 4G emulada, sin señal de arranque en frío de la función. Los 🟡 de A11y son solo `color-contrast` de `--ink-faint` / `ScoreEmpty` (deuda aceptada SPEC 25), idéntico en ambas apps. SEO 60 en Angular = `is-crawlable` (noindex intencional de staging, SPEC 27 paso 3), no un fallo. Consola sin errores ni avisos en las 24 combinaciones. Elemento LCP extraído solo en `/salon-de-la-fama` mobile (Angular); el resto es texto según el desglose (sin recurso de red), no consultado. Los datos de Next en `/juegos/asteroids` y `/salon-de-la-fama` salen con `ScoreEmpty` (sin puntuaciones) y los de Angular con filas reales: no son del todo comparables en esas dos rutas. Informes en `.lighthouse-reports/2026-11-27_1426/`.

## Paridad Next ↔ Angular

Angular (staging) frente a Next (producción), 2026-11-27 14:26. Δ LCP con la primera medición (entre paréntesis la segunda si se repitió).

| Ruta | Device | Δ A11y | Δ BP | Δ SEO | Δ LCP | Regresión |
| ---- | ------ | ------ | ---- | ----- | ----- | --------- |
| `/` | mobile | 0 | 0 | -40 | +11 % | sí (SEO: noindex staging) |
| `/` | desktop | 0 | 0 | -40 | +144 % | sí (SEO noindex + LCP) |
| `/juegos` | mobile | 0 | 0 | -40 | +109 % | sí (SEO noindex + LCP) |
| `/juegos` | desktop | 0 | 0 | -40 | +422 % | sí (SEO noindex + LCP) |
| `/juegos/asteroids` | mobile | 0 | 0 | -40 | -30 % (-3 %) | sí (SEO: noindex staging) |
| `/juegos/asteroids` | desktop | 0 | 0 | -40 | -10 % | sí (SEO: noindex staging) |
| `/salon-de-la-fama` | mobile | +1 | 0 | -40 | +124 % (+112 %) | sí (SEO noindex + LCP + CLS 0,20 vs 0,01) |
| `/salon-de-la-fama` | desktop | +1 | 0 | -40 | +177 % | sí (SEO noindex + LCP) |
| `/about` | mobile | 0 | 0 | -40 | -12 % | sí (SEO: noindex staging) |
| `/about` | desktop | -1 | 0 | -40 | +2 % | sí (SEO: noindex staging) |
| `/login` | mobile | 0 | 0 | -40 | +110 % (-1 %) | sí (SEO noindex; LCP no concluyente por varianza) |
| `/login` | desktop | 0 | 0 | -40 | +39 % | sí (SEO noindex + LCP) |

Leyenda: `Δ A11y/BP/SEO` = score Angular − score Next (puntos; negativo = Angular peor) · `Δ LCP` = LCP Angular vs Next (% sobre Next; positivo = Angular más lento) · `Regresión` = `sí` si Angular queda peor que Next por ≥5 puntos de score o ≥20 % de LCP, si no `no`.

Lectura: los -40 de SEO son todos el noindex de staging (esperado hasta el cambio de producción, SPEC 28). Las regresiones de LCP reales (con valores absolutos aún bajo 2,5 s) están en desktop `/`, `/juegos`, `/salon-de-la-fama`, `/login` y mobile `/juegos`, `/salon-de-la-fama`.

## Historial de auditorías

| Fecha y hora | App | Resumen | Abiertos |
| ------------ | --- | ------- | -------- |
| 2026-11-26 (sin hora) | angular | 6 rutas x mobile/desktop (dev server `:4200`). Scores 95-100 (solo contraste aceptado). Peor LCP: `/login` mobile 4,08-4,83 s. `/` mobile 2,35 y 3,63 s (varianza). Consola limpia. | 2 (Medio) |
| 2026-11-27 14:26 | ambas | SPEC 27 paso 4: Angular staging (Vercel) vs Next producción, 6 rutas x mobile/desktop. Peor score: SEO 60 en todo Angular (noindex staging, esperado); a11y mínimo 95 (deuda aceptada). Peor LCP: Angular `/login` mobile 5,11 s (2,40 s en repetición); `/juegos/asteroids` mobile 3,15 s (Next 3,26 s). CLS 0,20 en `/salon-de-la-fama` mobile. Consola limpia. | 4 (0 Alto, 3 Medio, 1 Bajo) |

Leyenda: `Fecha y hora` de lanzamiento de la auditoría (`date "+%Y-%m-%d %H:%M"`) · `App` auditada (`angular`/`next`/`ambas`) · `Resumen` rutas auditadas, peor score y peor LCP · `Abiertos` nº de hallazgos abiertos al cerrar (por severidad Alto/Medio/Bajo).

## Hallazgos abiertos

1. **Medio — CLS 0,20 en `/salon-de-la-fama` mobile (> 0,1), reproducible (2 de 2).** Evidencia: traza mobile (CPU x4, Fast 4G), clúster 4,7-5,7 s, score 0,1991; elementos `div#hall-panel`, `app-podium-slot.gold`, `div.hall-tabs`; causa señalada: carga de las fuentes `press-start-2p-latin-400-normal` y `jetbrains-mono-latin-400-normal` (`/media/*.woff2`). Next en la misma ruta: 0,01. Impacto: salto visible del podio y pestañas al cambiar de fuente (CWV). Corrección propuesta (sin aplicar): precargar las fuentes críticas (`<link rel="preload" as="font">`), `font-display: optional`/`size-adjust` en el fallback, o reservar altura del podio. Sugerencia: `/spec` de estabilidad visual de fuentes en Angular.
2. **Medio — LCP de Angular claramente más lento que Next en rutas SSR (regresión ≥20 %).** Evidencia: desktop `/` 1,51 vs 0,62 s, `/juegos` 1,21 vs 0,23 s, `/salon-de-la-fama` 1,23 vs 0,44 s; mobile `/juegos` 2,12 vs 1,01 s, `/salon-de-la-fama` 2,14/2,02 vs 0,96 s. TTFB igual (34-37 ms desktop), el retraso está en el _render delay_ (>95 % del LCP; p. ej. 1,85 s en `/salon-de-la-fama` mobile, elemento `div.logo-text.neon-cyan`). Sin insight de render-blocking en las trazas de Angular. Todo sigue ≤ 2,5 s salvo lo del punto 3, pero el margen en mobile es corto. Corrección propuesta (sin aplicar): analizar con `performance_analyze_insight` qué retrasa el primer pintado (ejecución de JS/hidratación, fuentes `@fontsource`, `styles.css` de `app/globals.css`); valorar fuentes con `preload` y diferir lo no crítico. Sugerencia: `/spec` de rendimiento de primer pintado de Angular antes del cambio de producción (SPEC 28).
3. **Medio — LCP de `/login` mobile 5,11 s / 2,40 s (alta varianza).** Evidencia: 2 trazas mobile, render delay 4,9 s en la 1ª; la ruta es `RenderMode.Client` (`angular/src/app/app.routes.server.ts:7`), el formulario se pinta tras cargar y ejecutar el JS. Next: 2,44 s. Ya reportado el 2026-11-26 en dev (4,08-4,83 s): persiste en build de producción. Corrección propuesta (sin aplicar): `RenderMode.Prerender` para `/login` (formulario sin datos) o diferir lo no crítico. Sugerencia: `/spec` de rendimiento de login.
4. **Bajo — LCP de `/juegos/asteroids` mobile 2,29 s / 3,15 s (> 2,5 s en la repetición).** Evidencia: 2 trazas mobile; Next también incumple (3,26 s), así que no es regresión de la migración. Impacto: detalle de juego lento en móvil en ambas apps. Corrección propuesta (sin aplicar): revisar qué pinta primero el detalle (cabecera de portada/`div.cover-*`); trabajarlo una vez para las dos apps o solo en Angular tras la SPEC 29.

Vigilar en la SPEC 28 (no es hallazgo de staging): SEO 60 por `is-crawlable` (noindex) en todo Angular staging; debe desaparecer en producción (Next ya tiene 100). Si el noindex llegara a producción sería Alto.

Aceptado (no reportado como nuevo): contraste de `--ink-faint` (#4a4f70 sobre #0f0f18, 2,39), `ScoreEmpty` (1,68 y 1,33) en ambas apps, en `/juegos/asteroids` (`.stat-strip .l`, `.lb-date`, `.se-hint`, `.ghost-row`), `/salon-de-la-fama` (`.th`, `.date`, `.dt`), `/about` desktop (labels del formulario) y `/login` (labels, versión, divisor, términos). El `h1` ausente en detalle y login no lo marca Lighthouse. Nota informativa: la categoría `agentic-browsing` (no puntuada en los umbrales) marca CLS 0,165-0,194 en 5 de 6 rutas desktop de Next y 0,094/0,205 en `/` y `/login` desktop de Angular; los valores de la traza son menores. Fuera de umbral de reporte.

Última actualización: 2026-11-27 14:26
