# Runbook: staging Angular en Vercel (SPEC 27)

Claude **no** tiene acceso a Vercel. Todo lo haces tú en los paneles. Staging usa Supabase **dev** y convive con Next, que sigue en producción (su proyecto de Vercel no se toca).

Placeholders: `<STAGING_URL>` (origen público de staging, p. ej. `https://arcade-vault-angular.vercel.app`, sin `/` final), `<STAGING_HOST>` (la misma URL sin `https://`), `<SPEC_BRANCH>` (`spec-27-angular-staging-vercel`).

> Nunca pegues claves ni tokens en el repo, en este archivo ni en el chat con Claude. Los valores reales viven solo en el panel de Vercel y en tu entorno local.

## 1. Crear el proyecto

Vercel → Add New → Project → importar el **mismo repositorio** que Next.

| Ajuste                                                | Valor                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Project Name                                          | `arcade-vault-angular`                                           |
| Framework Preset                                      | **Other** (la detección de Angular SSR no crea la función; ver abajo) |
| Root Directory                                        | `angular`                                                        |
| Include source files outside of the Root Directory    | **Activado** (el build usa `../lib` y `../public`)               |
| Node.js Version                                       | 22.x o superior                                                  |
| Build Command                                         | `npm run build` (ejecuta `prebuild`, que copia `../public`)      |
| Install Command / Output Directory                    | sin override en el panel (los fija `angular/vercel.json`)        |

**Por qué "Other":** con el preset Angular, Vercel publicó `dist/arcade-vault-angular` entero como estáticos, sin función, y `/` daba 404 `NOT_FOUND`. Ahora `angular/vercel.json` fija `outputDirectory` (`dist/arcade-vault-angular/browser`, CDN), un `rewrite` de todo a `/api` y la función `angular/api/index.mjs`, que reexporta `reqHandler` de `server.mjs`. Si ya creaste el proyecto con preset Angular: Settings → Build & Deployment → Framework Preset → Other, Save y Redeploy.

`angular/vercel.json` ya aporta el `installCommand` (`npm ci --prefix .. && npm ci`: instala también las dependencias de la raíz, porque `../app/globals.css` y `../lib/*` importan `tailwindcss` y `@supabase/ssr` y se resuelven desde la raíz), el `ignoreCommand` y las cabeceras de seguridad para los estáticos. El `ignoreCommand` solo construye despliegues con `VERCEL_ENV=production`, es decir, los de la _Production Branch_; no hay previews por rama.

## 2. Variables de entorno

Settings → Environment Variables. Solo entorno **Production** (desmarca Preview y Development). Todas son de servidor, sin prefijo público. Valores de Supabase **dev**.

| Variable                   | Valor                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `SUPABASE_URL`             | URL del proyecto Supabase dev                                                       |
| `SUPABASE_PUBLISHABLE_KEY` | clave publicable de dev                                                             |
| `SUPABASE_SECRET_KEY`      | clave secreta de dev; marcar **Sensitive**                                          |
| `SITE_URL`                 | `<STAGING_URL>`, sin `/` final (fija el `Origin` de CSRF y las redirecciones)       |
| `RESEND_API_KEY`           | clave de Resend de dev; marcar **Sensitive**                                        |
| `CONTACT_TO_EMAIL`         | como dev                                                                            |
| `CONTACT_FROM_EMAIL`       | como dev (dominio verificado en Resend)                                             |
| `NG_ALLOWED_HOSTS`         | `<STAGING_HOST>` (host permitido por el SSR; sin él cualquier petición responde 400) |

`NODE_ENV=production` lo pone Vercel. `NG_ALLOWED_HOSTS` se suma a `security.allowedHosts` (`localhost`) de `angular/angular.json`; admite varios hosts separados por comas.

Si cambia la URL de staging (p. ej. un dominio propio), actualiza `SITE_URL`, `NG_ALLOWED_HOSTS` y las Redirect URLs del apartado 5, y vuelve a desplegar.

## 3. Rama de producción

Settings → Environments → Production → Branch Tracking (o Settings → Git → Production Branch):

1. **Primer despliegue:** `<SPEC_BRANCH>`. Permite probar antes del merge.
2. **Tras el merge:** cambiar a `master` y comprobar que el siguiente despliegue termina OK. No olvidar este paso: dejar la rama temporal como _Production Branch_ rompería los despliegues cuando se borre.

## 4. Protección

- Settings → Deployment Protection → **Vercel Authentication** activa para Production. La URL queda accesible solo para miembros del equipo de Vercel.
- **Protection Bypass for Automation:** generar el secreto y guardarlo solo en tu entorno local, p. ej. `$env:PERF_BYPASS = "<token>"`. Nunca en el repo.
- Uso del bypass: cabeceras `x-vercel-protection-bypass: <token>` y `x-vercel-set-bypass-cookie: true` (`scripts/perf.mjs` las envía si existe `PERF_BYPASS`).
- Si el token se expone, regenerarlo en el mismo panel.

## 5. Supabase dev

Authentication → URL Configuration:

- **Redirect URLs**: añadir `<STAGING_URL>/auth/callback` y `<STAGING_URL>/auth/reset-password` (las de local se mantienen).
- **Site URL**: sin cambios.
- Google y GitHub no requieren cambios: su callback es el de Supabase (`https://<DEV_REF>.supabase.co/auth/v1/callback`).

## 6. Comprobación de la URL desplegada

Con `<TOKEN>` = tu token de bypass (variable de entorno local):

| Comprobación                | Cómo                                                                                | Esperado                                                      |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Protección                  | `curl -s -o /dev/null -w "%{http_code}" <STAGING_URL>/`                             | 401 o redirección al login de Vercel                          |
| Acceso con bypass           | `curl -s -o /dev/null -w "%{http_code}" -H "x-vercel-protection-bypass: <TOKEN>" <STAGING_URL>/` | 200                                             |
| Cabeceras en HTML           | `curl -sI -H "x-vercel-protection-bypass: <TOKEN>" <STAGING_URL>/`                  | `x-content-type-options`, `x-frame-options`, `referrer-policy`; sin `x-powered-by` |
| Cabeceras en API            | igual sobre `/api/games`                                                            | las tres cabeceras                                            |
| Cabeceras en estático       | igual sobre `/games/snake/fruits.png`                                               | las tres cabeceras (una sola vez cada una)                    |
| 404 real                    | `curl -s -o /dev/null -w "%{http_code}" ... <STAGING_URL>/ruta-inexistente`         | 404                                                           |
| `/perfil` sin sesión        | `curl -sI ... <STAGING_URL>/perfil`                                                 | 302 a `/login`                                                |
| Host no permitido           | `curl -s -o /dev/null -w "%{http_code}" -H "Host: otro.example" ...`                | no aplica en Vercel (el host lo fija el CDN); probado en local |
| Cookies de sesión           | iniciar sesión y revisar `Set-Cookie`                                               | `HttpOnly; Secure; SameSite=Lax`                              |
| Navegador sin Supabase      | pestaña Network durante el login y un guardado de puntuación                        | solo `/api/*` y `/auth/*`, nunca `supabase.co`                |
| Secretos fuera del JS       | buscar `SUPABASE_SECRET_KEY` y `RESEND_API_KEY` en el JS servido                    | sin resultados                                                |
| Funcional                   | las 6 pantallas, los 5 juegos, login (email, Google, GitHub), recuperar contraseña, guardar puntuación, `/perfil`, contacto | todo OK |

## 7. Rollback

Staging no es producción: si algo falla, Deployments → desplegar de nuevo el último despliegue bueno (Promote/Redeploy) o corregir y volver a empujar a la _Production Branch_.
