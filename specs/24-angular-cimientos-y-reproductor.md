# SPEC 24 — Angular: cimientos y reproductor de juegos

> **Estado:** Implementado
>
> **Depende de:** SPEC 06 (leaderboard y juegos), SPEC 07 (registro genérico de juegos), SPEC 10 (skins en el HUD), SPEC 11 (fin y reset del reproductor), SPEC 12 (controles táctiles), SPEC 13 (Gamepad MK-II), SPEC 14 (performance), SPEC 18 (solo logueados puntúan)
> **Fecha:** 2026-11-24
> **Objetivo:** Crear la app Angular SSR en `angular/`, que reutiliza los motores de `lib/` y sirve `/juegos/:id/jugar` con el mismo reproductor (canvas, HUD, opciones, pausa, fin y mando táctil) que la app Next.

---

## Por qué existe esta spec

**Motivo de la migración:** doble. (1) Formativo: aprender Angular moderno (signals, zoneless, SSR híbrido) sobre un producto real y comparable. (2) Alineación con el stack Angular del equipo. No hay un motivo técnico que obligue a dejar Next; por eso hay un criterio de abandono.

**Criterio de abandono:** si al terminar esta spec el reproductor Angular no alcanza la paridad (los 5 juegos jugables, aspecto equivalente, ≥58 FPS con CPU ×6), se revisa la migración antes de empezar la SPEC 25 y Next sigue siendo la app única.

Se migra de Next.js a Angular en seis specs; cada una deja las dos apps funcionando:

- **SPEC 24 (esta):** proyecto Angular, estilos, layout y reproductor (el núcleo del producto).
- **SPEC 25:** resto de pantallas (home, biblioteca, detalle, salón de la fama, about, login/perfil solo UI).
- **SPEC 26:** auth Supabase, guardado de puntuación, rutas protegidas, contacto (Resend), borrar cuenta.
- **SPEC 27:** despliegue de Angular en Vercel como staging/preview en paralelo a Next (Next sigue en producción).
- **SPEC 28:** cambio de producción a Angular con rollback (Next desplegable durante un periodo de gracia).
- **SPEC 29:** retirada de Next, Angular a la raíz, tooling (agentes, `npm run perf`, hook, skills) y docs. Detalle de la limpieza en "Alcance previsto de la SPEC 29".

Next sigue siendo la app desplegada hasta la SPEC 28. Las SPEC 22/23 (Neon), en borrador y diseñadas sobre Server Actions, se reescribirán para Angular después de la 29.

**Congelación de la UI:** mientras duran las SPEC 24-29, los cambios en reproductor, mando táctil y HUD exigen paridad en las dos apps (o se posponen). Los agentes `mobile-porter`, `skin-designer`, `game-performance-booster` y `/add-game` asumen rutas de Next hasta la SPEC 29.

### Alcance previsto de la SPEC 29 (limpieza de tooling)

Estado final: Angular en la raíz, sin Next. Los hooks los da solo el plugin `angular`.

- **Hooks:**
  - Borrar `.claude/hooks/format-lint.mjs` y el bloque `hooks` de `.claude/settings.json`. Con `root` = workspace Angular, el `format-lint.mjs` del plugin (Prettier + ESLint) y su `check-specs.mjs` (`Stop`/`SubagentStop`, exige `.spec.ts` con `tests: required`) cubren todo.
  - Antes de borrar, comprobar que el hook del plugin lintea `.html` con angular-eslint; si no, mantener el del proyecto reducido a eso.
  - Quitar la exclusión `angular/**` del ESLint de la raíz y la rama `angular/` del hook (ya no existen).
- **Plugins** (`enabledPlugins`): mantener `angular` y `angular-skills`; revisar `typescript-lsp` y `security-guidance` (conservar si aportan en Angular).
- **Agentes y skills de Next/juegos:** adaptar a Angular, no borrar a ciegas.
  - `skin-designer`, `mobile-porter`, `game-performance-booster`, `/add-game`, `/spec-impl-game`, `game-jam`: cambiar rutas de Next (`app/`, registro) por las de Angular.
  - `security-auditor` y su regla `.claude/rules/security-auditor.md`: reescribir para Angular + BFF Express (headers, CSP, cookies, `check:secret-client`).
  - `game-planner`, `game-expander`, `telegram-send`: sin cambios.
- **Código:** borrar `app/`, `components/`, `proxy.ts`, `next.config.ts`, `next-env.d.ts` y dependencias de Next/React; mover `lib/` y `angular/*` a la raíz; un solo `package.json`, `tsconfig`, `eslint.config` y `.prettierrc`; ajustar `vercel.json` y alias `@/*`.
- **Scripts:** adaptar `npm run perf` (rutas Angular), `check:secret-client` al BFF y `ALLOWED_DEV_ORIGINS` al dev server de Angular.
- **Docs:** reescribir `CLAUDE.md` (quitar Stack/Rutas/Arquitectura de Next y mantener "Convenciones Angular" como política principal), `AGENTS.md` (bloque de Next) y `README.md`; actualizar `references/implemented-games.md` y runbook de despliegue.
- **Specs:** marcar 01-21 como históricas; reescribir 22/23 (Neon) para Angular tras la 29.
- **Aceptación:** `ng build && ng test --watch=false && ng lint` OK desde la raíz; `grep -ri "next" ` solo en historial/specs; un `Write` de `.ts`/`.html` dispara un único hook (el del plugin).

## Alcance

**Dentro:**

- Proyecto `angular/` con Angular CLI (última versión estable, confirmada en el paso 1), SSR (`@angular/ssr`, servidor Express en `angular/src/server.ts`), componentes standalone, signals, zoneless, `--style=css`, `--skip-git` (con tests: se conserva el runner por defecto del CLI). `package.json` y `node_modules` propios.
- Calidad Angular (bloque "Convenciones Angular" de `CLAUDE.md`): tests unitarios con el runner del CLI (`ng test --watch=false`; `.spec.ts` junto a cada pieza nueva, incluidos motores-adaptadores y servicios; lógica de `lib/` ya compartida no se re-testea), ESLint con `angular-eslint` (`ng add angular-eslint`, `ng lint`) más `eslint-plugin-jsdoc` (JSDoc en API pública como aviso, `docs: jsdoc`) y reglas de accesibilidad de plantilla (`templateAccessibility`) en `angular/eslint.config.js`.
- Hook `format-lint` (`.claude/hooks/format-lint.mjs`): los archivos `.ts`/`.html` de `angular/` se lintan con el ESLint de `angular/` (`cwd: angular/`, `--fix`); el ESLint de la raíz sigue ignorando `angular/**`.
- Aislar las dos apps: el `tsconfig.json` de la raíz añade `"angular"` a `exclude` y `eslint.config.mjs` añade `"angular/**"` a `globalIgnores`; `next build` no lo compila. `.gitignore` cubre `angular/.angular/`, `angular/dist/` y `angular/node_modules/`.
- `lib/` compartido: `angular/tsconfig.json` mapea `@/lib/*` → `../lib/*`. Motores, `game-engine.ts`, `game-registry.ts`, `canvas-cache.ts` y `games.ts` se usan sin copiarlos ni modificarlos. Cambios mínimos permitidos en `lib/`, documentados: mover `toGame` (función pura) de `lib/games.server.ts` a `lib/games.ts` para reutilizarla en `server.ts` (`games.server.ts` importa `next/headers`), y, si algún módulo toca `window` al importarse en SSR, el ajuste mínimo. Si el `tsconfig` estricto de Angular rompe la compilación de `../lib`, se relajan flags en `angular/tsconfig.json`, nunca se modifica `lib/` por eso.
- Assets públicos: `angular.json` sirve `../public` (`{ "glob": "**/*", "input": "../public" }`) porque Arkanoid y Snake cargan sprites y sonidos por URL absoluta (`/games/arkanoid/*`, `/games/snake/fruits.png`). Si el builder no acepta una ruta fuera del workspace, se copia `public/` a `angular/` antes del build con un script `prebuild`/`prestart`.
- Estilos: `angular/src/styles.css` importa `../../app/globals.css`; Tailwind 4 con `@tailwindcss/postcss`. Fuentes autoalojadas con `@fontsource/*` (Press Start 2P, JetBrains Mono, Courier Prime; sin CDN, por RGPD) definiendo las mismas variables CSS (`--font-press-start`, `--font-jetbrains`, `--font-courier-prime`).
- Shell `AppComponent`: `av-bg`, `av-noise`, cabecera mínima (logo), `<main class="av-main">`, footer igual que `app/layout.tsx`. `lang="es"`, título "Arcade Vault". El nav completo va en la SPEC 25.
- Render por ruta (SSR híbrido): `angular/src/app/app.routes.server.ts` con `ServerRoute[]`. En esta spec: `juegos/:id/jugar` → `RenderMode.Client` (canvas, sin SEO, sin tocar `window` en servidor) y `**` → `RenderMode.Server`. Mapa completo para la SPEC 25 en Decisiones.
- Endpoint `GET /api/games/:id` en `angular/src/server.ts`: lee `games` + `game_stats` con `@supabase/supabase-js` (clave publicable, solo lectura, sin sesión) y devuelve `Game` con `toGame` de `lib/games.ts`; valida `:id` (`^[a-z0-9-]{1,40}$`, si no 404); 404 si no existe; 500 si falla. Las rutas `/api/*` se registran antes del handler de Angular. Variables `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en `angular/.env` (ignorado por git), cargadas en el servidor con `process.loadEnvFile()` (con comprobación de que `ng serve` ejecuta las rutas Express de `server.ts`; si no, se documenta la alternativa).
- Express: `x-powered-by` desactivado y las cabeceras `X-Content-Type-Options`, `X-Frame-Options: DENY` y `Referrer-Policy` equivalentes a las de `next.config.ts`.
- `GamesService` (`HttpClient`) y ruta `juegos/:id/jugar`: el componente de ruta comprueba `getGameDefinition(id)` de forma síncrona (no está en `GAME_REGISTRY` → "no encontrado") y carga el juego con `httpResource`/`resource` con estados: carga → "CARGANDO…"; error de lectura → `DataError`; `null` (404 del endpoint) → "no encontrado". Sin resolver (bloquearía el estado de carga). Sin estado HTTP 404 en `/juegos/xxx/jugar` (aceptado: ruta sin SEO). Las rutas desconocidas (`**`) sí devuelven 404 real.
- Componentes portados desde React, mismo DOM y clases CSS:
  - `GameCanvasComponent` (desde `components/game-canvas.tsx`): crea el motor solo en el navegador (`afterNextRender`), lo **recrea cuando cambia la definición** (el componente se reutiliza si solo cambia `:id`; React recrea por `[definition]`), `destroy()` al destruirse (`DestroyRef`), API `pause/resume/end/restart/setOption`.
  - `TouchControlsComponent` (desde `components/touch-controls.tsx`): Gamepad MK-II, solo `pointer: coarse`, emite `KeyboardEvent` sintéticos en `window`, desactivado en pausa/fin, `.on` con teclado físico `isTrusted`.
  - `GamePlayerComponent` (desde `components/game-player.tsx`): HUD del adaptador (signal que solo cambia cuando el motor emite), opciones `live` en el HUD y `restart` en el overlay de pausa, botón de pausa y `P`/`Esc`, botón de fin, menú de fin con enlace a `/salon-de-la-fama?juego=<id>` y reinicio. El reset de estado va en `DestroyRef`, sin el truco de Activity de React.
  - `DataErrorComponent` (desde `components/data-error.tsx`) y `NotFoundComponent` ("no encontrado" y 404 de `**`).
- Jugador siempre **invitado** en esta spec: HUD "INVITADO", menú de fin con "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" + botón a `/login`; no se guarda nada (SPEC 18).
- Docs: `CLAUDE.md` y `README.md` (carpeta `angular/`, comandos, estado de la migración). Corregir la mención a Netlify: el despliegue es Vercel (`vercel.json`, `references/deploy/prod-runbook.md`).

**Fuera (specs futuras):**

- Home, biblioteca, detalle, salón de la fama, about, login, perfil y nav completo (SPEC 25). Los enlaces a esas rutas desde el reproductor llevan, de momento, a la página 404 de Angular.
- Sesión, `useAuth`, guardado de puntuación, leaderboard, `proxy.ts`, contacto, borrar cuenta (SPEC 26).
- Despliegue de Angular en Vercel (SPEC 27), cambio de producción con rollback (SPEC 28), retirar Next, mover `lib/` y `angular/` a la raíz, adaptar `npm run perf`, agentes y skills (SPEC 29; el hook `format-lint` para `angular/` ya se adapta aquí).
- Tests e2e automatizados (los unitarios sí van dentro, ver Alcance).
- Partir `globals.css` en estilos por componente.
- Neon (SPEC 22/23, se reescriben después).

---

## Modelo de datos

Sin datos nuevos ni migraciones. Se reutilizan `Game`, `GameDefinition`, `GameSnapshot`, `GameOption` y `TouchControls` de `lib/`.

```ts
// angular/src/app/games.service.ts
getGame(id: string): Observable<Game | null>; // GET /api/games/:id; 404 → null
```

```
// angular/src/server.ts
GET /api/games/:id → 200 Game | 404 | 500
```

Variables (solo servidor SSR, `angular/.env`): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (mismos valores que `NEXT_PUBLIC_SUPABASE_*` de la app Next). La clave publicable no es secreta (ya va en el bundle de Next y la protegen las policies RLS); `SUPABASE_SECRET_KEY` no se usa en esta spec.

---

## Plan de implementación

1. **Proyecto Angular y aislamiento.**
   - Consultar `npx ctx7@latest docs /websites/angular_dev` (SSR, zoneless, Tailwind) y crear `angular/` con `ng new --skip-git` (SSR, standalone, zoneless, CSS, con tests), añadir `angular-eslint` y `eslint-plugin-jsdoc`, comprobar que `ng test --watch=false` y `ng lint` pasan con el proyecto por defecto y adaptar el hook `format-lint` (ver Alcance). Excluir `angular/` en `tsconfig.json` (`exclude`) y `eslint.config.mjs` (`globalIgnores`) de la raíz; `.gitignore`. Comprobar qué `.prettierrc` aplica el hook `format-lint` a `angular/`.
   - Verificación: en la raíz `npm run lint` y `npm run build` OK; `cd angular && npm run build` OK; `npm start` en `angular/` sirve la página por defecto en `http://localhost:4200` con Next en paralelo en `:3000`.
2. **Estilos, fuentes, assets, shell y `lib/` compartido.**
   - Alias `@/lib/*` → `../lib/*` (relajando flags estrictos solo en `angular/tsconfig.json` si hace falta); `styles.css` con `globals.css` + `@source` de las plantillas de `angular/src`; fuentes `@fontsource/*`; assets de `../public` en `angular.json`; `AppComponent` con fondo, cabecera, `main` y footer.
   - Verificación: screenshot (Playwright, `.playwright-screenshots/`) de `:4200` con mismo fondo, tipografías y footer que `:3000`; el CSS compilado contiene las utilidades y clases de `globals.css`; `http://localhost:4200/games/snake/fruits.png` devuelve 200; un import de prueba de `GAME_REGISTRY` compila en el build SSR sin errores de `window`/`document`.
3. **Datos del juego y ruta.**
   - Mover `toGame` a `lib/games.ts`; `GET /api/games/:id` en `server.ts` (con cabeceras, validación de `:id` y `x-powered-by` desactivado); `angular/.env`; `GamesService`; ruta `juegos/:id/jugar` con `httpResource`/`resource`, "no encontrado" y `DataError`.
   - Verificación: `curl :4200/api/games/snake` devuelve el `Game` con `best`/`plays` iguales a los de `/juegos/snake` en Next; `/api/games/xxx` → 404; `/juegos/xxx/jugar` → página "no encontrada" en el navegador; `/ruta-inexistente` → estado HTTP 404; con `SUPABASE_URL` incorrecta → `DataError`; el HTML de `/juegos/snake/jugar` es el shell (CSR, sin contenido del juego); ni `SUPABASE_SECRET_KEY` ni nada de `.env` aparece en `angular/dist/**/browser`.
4. **Canvas y mando táctil.**
   - `GameCanvasComponent` y `TouchControlsComponent` con la misma API, DOM y clases que los de React.
   - Verificación: en `/juegos/tetris/jugar` el juego arranca y responde al teclado; con Playwright táctil 390×844 el mando aparece fijo abajo, mueve la pieza y no aparece en escritorio; al salir de la ruta el bucle se detiene (sin errores en consola).
5. **Reproductor completo.**
   - `GamePlayerComponent`: HUD, opciones `live`/`restart`, pausa (botón, `P`, `Esc`), fin, menú de fin de invitado, reinicio, estado limpio al volver a entrar.
   - Verificación: los 5 juegos (asteroids, tetris, arkanoid, snake, frogger) se juegan, cambian de skin en vivo, pausan, reanudan, terminan y reinician; Arkanoid y Snake cargan sprites y sonidos sin errores en consola; el menú de fin muestra el aviso de invitado y enlaza a `/login` y `/salon-de-la-fama?juego=<id>`; navegar atrás/adelante entre dos `/juegos/<id>/jugar` distintos recrea el motor del juego correcto; checklist visual por zona (HUD, CRT, overlay de pausa, modal de fin, mando) contra Next en escritorio y 390×844; `PERF_URL=<url del build de producción> npm run perf` (build servido con `PORT`, no `ng serve`) sale con código 0 (≥58 FPS con CPU ×6), sin `zone.js` en polyfills, y el JS/frame no es peor que el de Next (la métrica cuenta cada callback de rAF; comparar JS/frame, no solo FPS).
6. **Docs y cierre.**
   - `CLAUDE.md` y `README.md` (carpeta `angular/`, `cd angular && npm start`, puerto 4200 en dev y `PORT` en prod, `angular/.env`, plan 24-29, corrección Netlify → Vercel); Estado → Implementado.
   - Verificación: los dos docs mencionan SPEC 24 y están sincronizados; todos los criterios marcados.

Un commit por paso (`24-angular-cimientos-y-reproductor: Paso N`).

---

## Criterios de aceptación

- [x] `angular/` compila (`npm run build`) y sirve con SSR (dev en `:4200`, build en `PORT`); la app Next sigue compilando, pasando lint y funcionando en `:3000`.
- [x] `cd angular && ng build && ng test --watch=false && ng lint` pasa; cada componente/servicio nuevo tiene su `.spec.ts`; el hook `format-lint` lintea (y corrige) un `.ts` de `angular/` con errores deliberados de prueba.
- [x] Ningún archivo de `lib/` está duplicado en `angular/`; los motores se importan por el alias `@/lib/*`. Los únicos cambios en `lib/` son los documentados (`toGame`, y los ajustes SSR mínimos si hicieron falta).
- [x] `/juegos/<id>/jugar` funciona en Angular para los 5 juegos: jugar, skin en vivo, opciones `restart` en pausa, pausa con botón/`P`/`Esc`, fin y reinicio.
- [x] Los assets de Arkanoid y Snake (sprites y sonidos) cargan sin errores en consola.
- [x] Id inexistente → página "no encontrada"; ruta desconocida → HTTP 404; fallo de lectura → `DataError`.
- [x] `/juegos/:id/jugar` se renderiza en cliente (`RenderMode.Client`), `**` en servidor; el navegador no llama a Supabase (solo a `/api/*`) y `SUPABASE_SECRET_KEY` no aparece en `angular/`.
- [x] Navegar entre dos `/juegos/<id>/jugar` distintos recrea el motor y deja el estado limpio.
- [x] El mando táctil aparece solo con `pointer: coarse`, controla el juego y se desactiva en pausa/fin.
- [x] El jugador se muestra como INVITADO y el menú de fin enseña el aviso de iniciar sesión sin guardar nada.
- [x] Aspecto equivalente a Next según el checklist por zona (HUD, CRT, overlay de pausa, modal de fin, mando), en escritorio y 390×844.
- [x] `npm run perf` contra el build de producción ≥58 FPS con CPU ×6 en todos los casos, sin `zone.js` y con JS/frame no peor que Next. _Medido con ventana (como la SPEC 14), build de producción: 16/16 casos a ≥60 FPS con CPU ×6, `npm run perf` con código 0, sin `zone.js`. JS/frame ×6 medio: Angular 0,80 ms frente a Next 0,84 ms; Angular mejor en Asteroids y Snake, similar en Tetris y Arkanoid, y, en Frogger, equivalente: 5 rondas alternadas dan ×1 0,457 ms (Angular) frente a 0,443 ms (Next) y ×6 2,28 frente a 1,96 ms, con una dispersión entre rondas (0,36-0,62 ms en ×1; 1,0-4,1 ms en ×6) mayor que la diferencia. Cada app programa un único `requestAnimationFrame` (el bucle del motor, ~1.200 llamadas y ~535 ms en ambas): Angular no añade callbacks propios._
- [x] `CLAUDE.md` y `README.md` actualizados (incluida la corrección Netlify → Vercel).

---

## Decisiones

- **Sí:** migrar en 6 specs (24-29) con las dos apps conviviendo. Razón: cada paso deja algo funcionando y comparable con Next; el despliegue se separa en staging (27), cambio con rollback (28) y retirada (29) para no hacerlo de golpe.
- **Sí:** motivo formativo + stack Angular del equipo, con criterio de abandono (ver "Por qué").
- **Sí:** Angular antes que Neon (SPEC 22/23 se reescriben después). Razón: 22/23 dependen de Server Actions de Next; hacerlas antes sería doble trabajo.
- **Sí:** SSR con `@angular/ssr`. Razón: equivale al render en servidor actual y da un servidor Express para lo que necesita secretos (SPEC 26).
- **Sí:** SSR híbrido con modo de render por ruta (`app.routes.server.ts`). Mapa para la SPEC 25-26: `/`, `/juegos`, `/juegos/:id`, `/salon-de-la-fama` → Server (datos vivos + SEO); `/about` → Prerender; `/juegos/:id/jugar`, `/login`, `/perfil`, `/auth/reset-password` → Client (sin SEO, dependen de canvas o sesión); `**` → Server (404 real). `/auth/callback` es ruta Express, no Angular. Razón: cada página usa el modo que necesita.
- **Sí:** BFF en el Express del propio SSR (`/api/*`), sin backend separado. Razón: hace falta servidor por secretos (clave secreta de Supabase, Resend, cookies, IP); reevaluar solo con jobs, websockets/multijugador o más clientes.
- **Sí:** lectura de datos vía endpoint `/api/*` del servidor SSR en vez de supabase-js en el navegador. Razón: prepara la SPEC 22 (el navegador deja de hablar con la BD) y usa el mismo patrón de la SPEC 26 para auth/contacto. No es por ocultar la clave publicable, que no es secreta.
- **Sí:** `httpResource`/`resource` en el componente en vez de resolver. Razón: un resolver bloquea la navegación y no deja pintar "CARGANDO…".
- **Sí:** carpeta paralela `angular/`. Razón: Next sigue desplegando y se puede comparar pantalla a pantalla. Alternativa descartada por ahora: strangler con rewrites de Vercel (llevar rutas sueltas a producción), por el coste de dos despliegues y cookies compartidas; se puede reevaluar en la SPEC 27.
- **Sí:** `lib/` compartido por alias. Razón: una sola fuente para los motores; se mueve en la SPEC 29.
- **Sí:** standalone + signals + zoneless. Razón: lo que trae por defecto la versión actual; el bucle del canvas no dispara detección de cambios (los motores solo emiten el snapshot cuando cambia).
- **Sí:** reutilizar `globals.css` y mismas clases. Razón: aspecto idéntico sin rediseñar; partirlo es otra spec.
- **Sí:** fuentes autoalojadas (`@fontsource/*`). Razón: `next/font` ya las autoaloja; un CDN externo plantea un problema de RGPD en la UE.
- **Sí:** el reset de estado del reproductor va en `DestroyRef`. Razón: Angular destruye el componente al salir de la ruta; el truco de Activity (`cacheComponents`) es de React.
- **Sí:** despliegue en Vercel. Razón: es lo que usa el proyecto (`vercel.json`, runbook); `CLAUDE.md` mencionaba Netlify por error.
- **No:** tests automatizados. Razón: el proyecto no tiene test runner; se verifica con Playwright y `npm run perf`.
- **No:** guardar puntuación ni sesión en esta spec. Razón: depende de auth (SPEC 26); el invitado ya está definido por la SPEC 18.

---

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                            |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Algún motor o `canvas-cache` toca `window`/`document` al importarse y rompe el SSR         | Crear motores solo en `afterNextRender`; si un import falla, cambio mínimo en `lib/` documentado      |
| El builder de Angular no resuelve imports fuera de `angular/` (`../lib`)                   | Paso 2 lo prueba primero; alternativa: `rootDir`/`include` ampliados en `angular/tsconfig.json`       |
| El `tsconfig` estricto de Angular (`noPropertyAccessFromIndexSignature`…) rompe `../lib`   | Relajar flags en `angular/tsconfig.json`; nunca cambiar `lib/` solo por eso                           |
| El builder no sirve `../public` (assets fuera del workspace); Arkanoid y Snake no cargan   | Verificación 200 en el paso 2; alternativa: copia de `public/` a `angular/` en `prebuild`/`prestart`  |
| Tailwind no escanea las plantillas de Angular al importar `globals.css` desde fuera        | `@source` explícito a `angular/src` en `styles.css`; comprobar utilidades en el CSS compilado         |
| `tsconfig`/ESLint de la raíz recogen archivos de `angular/` y rompen `next build`          | Exclusión en el paso 1 y verificación con `npm run build` en la raíz                                  |
| Diferencias de API entre versiones de Angular (zoneless, SSR, `httpResource`)              | Consultar ctx7 en cada paso que dependa de API                                                        |
| `ng serve` no ejecuta las rutas Express de `server.ts` o no carga `angular/.env`           | Comprobar en el paso 3 con ctx7; `process.loadEnvFile()`; documentar la alternativa (servir el build) |
| Hook `format-lint` aplica la config de la raíz a `angular/`                                | ESLint de la raíz ignora `angular/`; Prettier vale igual; revisar en el paso 1                        |
| Rendimiento distinto al de React o `npm run perf` inflado por el rAF del planificador      | Signals + zoneless; perf contra el build de producción; comparar JS/frame con Next, no solo FPS       |
| Doble mantenimiento de la UI del reproductor durante 24-29; agentes atados a rutas de Next | Congelar la UI del reproductor o exigir paridad; los agentes se adaptan en la SPEC 29                 |
| El motor no se recrea al navegar entre dos `/jugar` (componente reutilizado)               | Recrear el motor al cambiar la definición; verificado en el paso 5                                    |
| La migración no llega a paridad y se vuelve en coste muerto                                | Criterio de abandono en "Por qué" tras esta spec; Next sigue desplegado hasta la SPEC 28              |

---

## Qué **no** entra en esta spec

- Resto de pantallas y nav (SPEC 25).
- Auth, guardado, leaderboard, contacto, borrar cuenta (SPEC 26).
- Despliegue en Vercel, cambio de producción, retirada de Next y tooling (SPEC 27-29).
- Linter de Angular, tests automatizados, CSS por componente, Neon.

Cada uno, si llega, va en su propia spec.
