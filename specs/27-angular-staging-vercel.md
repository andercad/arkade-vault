# SPEC 27 — Angular: despliegue en Vercel como staging

> **Estado:** Implementado
>
> **Depende de:** SPEC 24 (cimientos y reproductor Angular), SPEC 25 (resto de pantallas), SPEC 26 (auth, guardado y contacto), SPEC 17 (medidas de seguridad), SPEC 20 (endurecer auth: IP y origen)
> **Fecha:** 2026-11-26
> **Objetivo:** Desplegar `angular/` en un segundo proyecto de Vercel como staging con URL fija, contra Supabase dev, público pero no indexable (plan gratuito de Vercel: sin bypass de automatización), en paralelo a Next, que sigue en producción.

---

## Por qué existe esta spec

Cuarta de las seis specs de migración (24-29). Con la SPEC 26, Angular tiene la misma funcionalidad que Next, pero solo se ha probado en local (`ng serve` y el build servido con Node). Antes de cambiar producción (SPEC 28) hay que validarlo en la infraestructura real: función Node de Vercel, CDN, cookies `Secure`, cabeceras, `allowedHosts`, IP del jugador y variables de entorno.

Next sigue desplegado y en producción. Se mantiene la **congelación de la UI** de la SPEC 24: esta spec no toca reproductor, mando ni HUD.

**Criterio de continuidad:** si el staging no alcanza la paridad con Next (funcional, ≥58 FPS con CPU ×6, Lighthouse no peor), se corrige antes de la SPEC 28.

---

## Alcance

**Dentro:**

- **Proyecto Vercel nuevo** (`arcade-vault-angular`), mismo repositorio que Next, con _Root Directory_ `angular/` y "Include source files outside of the Root Directory" activado (el build usa `../lib` y `../public`). El proyecto de Next no se toca. Claude no tiene acceso a Vercel: la configuración la hace el usuario con un runbook (ver abajo).
- **`angular/vercel.json`:**
  - `ignoreCommand`: solo construye despliegues con `VERCEL_ENV=production` (no depende del nombre de la rama; permite usar la rama de la spec en el primer despliegue). Sin previews por rama.
  - `outputDirectory` (`dist/arcade-vault-angular/browser`), `rewrites` de todo a `/api` y `functions.includeFiles`: el preset Angular de Vercel no creó la función SSR (todo salió como estáticos y `/` daba 404), así que el proyecto usa preset **Other** y la función propia `angular/api/index.mjs`, que reexporta `reqHandler` de `server.mjs`.
  - `headers` para los estáticos del CDN (que no pasan por Express): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` (mismos valores que `server.ts` y `next.config.ts`) y `X-Robots-Tag: noindex, nofollow` (solo staging; no está en `server.ts`).
- **`angular/angular.json`:** `security.allowedHosts` incluye el dominio de staging además de `localhost` (o `NG_ALLOWED_HOSTS` si ctx7 confirma que es la vía soportada). Un host no permitido sigue rechazándose.
- **Runbook `references/deploy/staging-angular-runbook.md`:**
  - Crear el proyecto: framework Angular, Root Directory `angular`, _include outside root_, Node 22+, comando de build `npm run build` (ejecuta `prebuild`).
  - Variables de entorno **solo en Production** (Supabase **dev**): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (marcada _sensitive_), `SITE_URL` (URL fija de staging sin `/` final), `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`. `NODE_ENV=production` lo pone Vercel.
  - _Production Branch_: la rama de la spec en el primer despliegue; `master` tras el merge.
  - Acceso: staging **público** (plan gratuito de Vercel: sin _Protection Bypass for Automation_ no se pueden automatizar las mediciones). Vercel Authentication (_Standard Protection_) no protege el dominio de producción del proyecto, así que no se usa como control de acceso; `X-Robots-Tag: noindex, nofollow` evita la indexación. Nadie usa la web actual y el objetivo de las SPEC 24-29 es retirar Next, así que el riesgo es bajo (datos de prueba de Supabase dev); queda el consumo de cuota de Resend por el formulario de contacto.
  - Supabase dev → Authentication → URL Configuration: añadir `<STAGING_URL>/auth/callback` y `<STAGING_URL>/auth/reset-password` a Redirect URLs (Site URL no cambia). Google y GitHub no requieren cambios: su callback es el de Supabase.
  - Tabla de comprobación de la URL desplegada.
- **`scripts/perf.mjs`:** variable opcional `PERF_BYPASS` (token de bypass; no se usa en este staging público, queda para un staging protegido); si existe, envía las cabeceras `x-vercel-protection-bypass` y `x-vercel-set-bypass-cookie`. Sin ella el comportamiento no cambia.
- **Agentes `lighthouse-auditor` y `security-auditor`:** cambio mínimo para admitir una URL base de staging (parámetro opcional). La adaptación completa a Angular es de la SPEC 29.
- **Docs:** `CLAUDE.md` y `README.md` (staging, runbook, `PERF_BYPASS`).

**Fuera (specs futuras):**

- Supabase de producción, dominio propio y cambio de producción con rollback (SPEC 28).
- Previews por rama o PR y `SITE_URL` dinámico (`VERCEL_BRANCH_URL`): URL de staging fija.
- Corregir `references/deploy/prod-runbook.md` (menciona Netlify) y su variante para Angular (SPEC 28).
- Retirar Next, mover `lib/` y `angular/` a la raíz y adaptar todo el tooling (SPEC 29).
- CSP/HSTS, límite de envíos de contacto/login y política de IP fuera de Vercel (spec futura, ya anotado en SPEC 26).
- Ejecutar los tests en Vercel (CI) y Neon (SPEC 22/23, se reescriben tras la 29).

---

## Modelo de datos

Sin datos nuevos ni migraciones. Solo variables de entorno en Vercel (todas de servidor, sin prefijo público):

| Variable                   | Valor en staging                        |
| -------------------------- | --------------------------------------- |
| `SUPABASE_URL`             | proyecto Supabase **dev**               |
| `SUPABASE_PUBLISHABLE_KEY` | clave publicable de dev                 |
| `SUPABASE_SECRET_KEY`      | clave secreta de dev (_sensitive_)      |
| `SITE_URL`                 | URL fija de staging, sin `/` final      |
| `RESEND_API_KEY`           | clave de Resend de dev (_sensitive_)    |
| `CONTACT_TO_EMAIL`         | como dev                                |
| `CONTACT_FROM_EMAIL`       | como dev (dominio verificado en Resend) |

---

## Diseño de clases

Sin piezas Angular nuevas: los cambios son de configuración (`angular/vercel.json`, `angular/angular.json`), un script (`scripts/perf.mjs`), agentes y runbook. Si el despliegue obliga a tocar `angular/src/server.ts` o `angular/src/server/*`, el cambio se hace con su prueba en el mismo paso.

---

## Plan de implementación

1. **Configuración de despliegue en el repo.**
   - **Acciones:**
     - Consultar `npx ctx7@latest docs` de Angular SSR en Vercel (`allowedHosts`/`NG_ALLOWED_HOSTS`, `reqHandler`) y de `vercel.json` (`ignoreCommand`, `headers`, _include outside root_).
     - Crear `angular/vercel.json` con `ignoreCommand` por `VERCEL_ENV` y las tres cabeceras para estáticos.
     - Añadir el dominio de staging a `security.allowedHosts` de `angular/angular.json` (o usar `NG_ALLOWED_HOSTS`).
   - **Verificaciones:**
     - `cd angular && ng build && ng test --watch=false && ng lint` sin errores.
     - Servir el build con `NODE_ENV=production SITE_URL=https://<staging> PORT=4300 node dist/arcade-vault-angular/server/server.mjs`: `curl -H "Host: <staging>" http://localhost:4300/` → 200 y un host no permitido es rechazado.
     - En la raíz `npm run lint && npm run build` siguen OK (Next intacto).

2. **Runbook de staging.**
   - **Acciones:**
     - Crear `references/deploy/staging-angular-runbook.md` con los apartados de Alcance (proyecto, variables, rama, protección, Redirect URLs de Supabase dev, comprobación).
   - **Verificaciones:**
     - El runbook cubre todas las variables de `angular/.env.example` y la tabla de "Modelo de datos".
     - `grep -iE "eyJ|sb_secret|re_[A-Za-z0-9]{10,}" references/deploy/staging-angular-runbook.md` sin resultados (sin claves ni tokens).
     - Incluye staging público con `noindex` (sin Vercel Authentication ni bypass), rama temporal → `master` y Redirect URLs.

3. **Primer despliegue y smoke funcional.** El usuario sigue el runbook; Claude verifica la URL.
   - **Acciones:**
     - Crear el proyecto Vercel, definir variables y desplegar desde la rama de la spec.
     - Playwright contra la URL de staging y `curl`.
   - **Verificaciones:**
     - La URL responde 200 sin autenticación y lleva `X-Robots-Tag: noindex, nofollow`.
     - Las 6 pantallas cargan; se juegan los 5 juegos; login con email, Google y GitHub; recuperar contraseña; guardar puntuación con sesión; `/perfil` (usuario, contraseña); el contacto llega por Resend.
     - `/ruta-inexistente` → HTTP 404 real; `/perfil` sin sesión → 302 a `/login`.
     - `curl -I` muestra las tres cabeceras de seguridad (y `X-Robots-Tag`) en HTML, en `/api/games` y en un estático (`/games/snake/fruits.png`) y no hay `x-powered-by`.
     - Las cookies de sesión llevan `HttpOnly; Secure; SameSite=Lax`.
     - El navegador solo llama a `/api/*` y a `/auth/*` (nunca a `supabase.co`); `SUPABASE_SECRET_KEY` y `RESEND_API_KEY` no aparecen en el JS servido.
     - Next en producción sigue funcionando sin cambios.

4. **Medición en staging.**
   - **Acciones:**
     - Añadir `PERF_BYPASS` a `scripts/perf.mjs`.
     - Añadir el parámetro de URL base a `.claude/agents/lighthouse-auditor.md` y `.claude/agents/security-auditor.md`.
     - Ejecutar `perf`, `lighthouse-auditor` (modo `ambas`: Next en producción frente a Angular en staging) y `security-auditor`.
   - **Verificaciones:**
     - `PERF_URL=<staging> npm run perf` sale con código 0 (≥58 FPS con CPU ×6, 5 juegos × skins).
     - `references/lighthouse/lighthouse-audit.md` registra la tabla de paridad Next ↔ Angular (mobile y desktop); accesibilidad, SEO y buenas prácticas de staging no son peores que Next (deuda de contraste de la SPEC 25 aceptada); TTFB y LCP anotados.
     - `references/security/security-audit.md` sin hallazgos nuevos de severidad alta, o corregidos dentro del alcance.
     - Sin `PERF_BYPASS`, `node scripts/perf.mjs` contra `localhost` se comporta igual que antes.

5. **Docs y cierre.**
   - **Acciones:**
     - Actualizar `CLAUDE.md` y `README.md` (staging, runbook, `PERF_BYPASS`, estado 24-29).
     - Estado → Implementado; tras el merge, apuntar _Production Branch_ a `master` (runbook).
   - **Verificaciones:**
     - Ambos docs mencionan la SPEC 27 y `references/deploy/staging-angular-runbook.md`, y están sincronizados.
     - Todos los criterios de aceptación marcados.
     - Tras el merge, el despliegue de `master` en staging termina OK (manual).

Un commit por paso (`27-angular-staging-vercel: Paso N`).

---

## Criterios de aceptación

- [x] `angular/vercel.json` existe, solo construye `VERCEL_ENV=production` y aplica las tres cabeceras de seguridad a los estáticos.
- [x] El build de Angular se despliega en el segundo proyecto Vercel y sirve con SSR en una URL fija; el proyecto de Next no cambia.
- [x] La URL de staging es accesible sin autenticación y no indexable (`X-Robots-Tag: noindex, nofollow`).
- [x] Smoke completo OK en staging (pantallas, 5 juegos, login email/Google/GitHub, recuperación, guardar puntuación, perfil, contacto).
- [x] Cabeceras de seguridad en HTML, `/api/*` y estáticos; sin `x-powered-by`; cookies `HttpOnly; Secure; SameSite=Lax`.
- [x] Ruta desconocida → 404 real; `/perfil` sin sesión → 302 a `/login`.
- [x] El navegador no llama a Supabase y ningún secreto aparece en el JS servido.
- [x] `npm run perf` contra staging ≥58 FPS con CPU ×6 en todos los casos (código 0).
- [x] Lighthouse de staging no es peor que el de Next en producción (accesibilidad, SEO, buenas prácticas); registrado en `references/lighthouse/lighthouse-audit.md`.
- [x] `security-auditor` sin hallazgos nuevos de severidad alta (o corregidos).
- [x] Sin UI nueva: la accesibilidad de staging es igual a la de Angular en local (sin regresiones por el despliegue).
- [x] `cd angular && ng build && ng test --watch=false && ng lint` OK y, en la raíz, `npm run lint && npm run build` OK.
- [x] Runbook sin claves ni tokens; `CLAUDE.md` y `README.md` actualizados y sincronizados.

---

## Plan de tests

Sin componentes, servicios, guards, pipes ni directivas nuevos: no hay `.spec.ts` nuevos. Si el paso 1 obliga a modificar `angular/src/server.ts` o `angular/src/server/*`, su prueba se añade o ajusta en ese mismo paso. `ng test --watch=false` debe seguir en verde.

---

## Decisiones

- **Sí:** segundo proyecto Vercel con la misma repo (Root Directory `angular/`). Razón: Next sigue intacto y en producción; la SPEC 28 solo mueve dominio y variables.
- **Sí:** Supabase **dev**. Razón: prod no se toca hasta la SPEC 28; los datos de staging son de prueba (se mezclan con el desarrollo local, aceptado).
- **Sí:** URL fija de staging, sin previews. Razón: `SITE_URL`, `Origin` (CSRF), Redirect URLs de Supabase y `allowedHosts` son fijos; previews exigirían `SITE_URL` dinámico y comodines.
- **Sí:** `ignoreCommand` por `VERCEL_ENV`. Razón: no depende del nombre de la rama y permite desplegar la rama de la spec antes del merge.
- **Sí:** staging público + `noindex`, sin depender de Vercel Authentication. Razón: _Standard Protection_ no cubre el dominio de producción (`curl` sin cookies → 200) y el plan gratuito no ofrece bypass de automatización; las mediciones (`perf`, Lighthouse, `security-auditor`) necesitan acceso programático; nadie usa la web actual, los datos son de Supabase dev y el objetivo es retirar Next. (Decisión revisada tras el primer despliegue; antes: Vercel Authentication + bypass.)
- **Sí:** función propia `angular/api/index.mjs` + rewrite y preset Other. Razón: la detección automática de Angular SSR de Vercel no enganchó `reqHandler` con este build (Angular 22, `outputMode: server`); se descubrió en el primer despliegue (paso 3).
- **Sí:** cabeceras también en `vercel.json`. Razón: los estáticos los sirve el CDN y no pasan por Express.
- **Sí:** configuración manual con runbook. Razón: Claude no tiene acceso a Vercel (igual que con prod).
- **Sí:** Resend y OAuth activos con claves de dev. Razón: paridad completa antes de la SPEC 28.
- **Sí:** cambios mínimos en `perf.mjs` y agentes de auditoría ahora; adaptación completa en la SPEC 29.
- **No:** previews por PR, dominio propio, Supabase de prod, strangler con rewrites (descartado en la SPEC 24).

---

## Riesgos

| Riesgo                                                                      | Mitigación                                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| El build no resuelve `../lib` o `../public` desde Root Directory `angular/` | _Include source files outside of the Root Directory_ activado; verificado en el primer despliegue |
| `allowedHosts` rechaza el host de Vercel (400 en SSR)                       | Paso 1: añadir el dominio y probar con `Host`; ctx7 para `NG_ALLOWED_HOSTS`                       |
| Estáticos del CDN sin cabeceras de seguridad                                | `headers` en `angular/vercel.json`; verificado con `curl -I` en el paso 3                         |
| `SITE_URL` incorrecta rompe CSRF (403) y redirecciones                      | Runbook con valor exacto sin `/` final; smoke de login y contacto                                 |
| Redirect URLs de Supabase dev sin la URL de staging: OAuth y reset fallan   | Paso explícito en el runbook; smoke de Google/GitHub y recuperación                               |
| Arranque en frío de la función aumenta TTFB y LCP                           | Medir en Lighthouse; si es relevante, spec de rendimiento posterior                               |
| Staging público: spam al contacto gasta cuota de Resend (dev)               | Aceptado (sin usuarios); `noindex`; límite de contacto/login en spec futura                       |
| Filtración de claves en el runbook                                          | Nunca en el repo; verificación por `grep` en el paso 2; rotar si se expone                        |
| Rama temporal como _Production Branch_ olvidada tras el merge               | Paso 5 y runbook; criterio de cierre                                                              |
| `clientIp` solo es fiable tras el proxy de Vercel                           | Staging ya está tras Vercel (`x-vercel-forwarded-for`); verificar rate limit en el smoke          |

---

## Qué **no** entra en esta spec

- Cambio de producción, Supabase prod, dominio propio y rollback (SPEC 28).
- Retirada de Next y tooling completo (SPEC 29).
- Previews por PR, CSP/HSTS, límite de contacto/login y CI de tests en Vercel.
- Cambios de UI en reproductor, mando o HUD (congelación de la SPEC 24).
