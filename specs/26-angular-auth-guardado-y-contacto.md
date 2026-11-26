# SPEC 26 — Angular: auth, guardado de puntuación y contacto

> **Estado:** Aprobado
>
> **Depende de:** SPEC 24 (cimientos y reproductor Angular), SPEC 25 (resto de pantallas), SPEC 03 (about/contacto), SPEC 16 (autenticación), SPEC 17 (medidas de seguridad), SPEC 18 (solo logueados puntúan), SPEC 19 (contraseña y borrar cuenta), SPEC 20 (endurecer auth)
> **Fecha:** 2026-11-26
> **Objetivo:** Conectar en `angular/` la sesión Supabase a través del BFF Express (cookies httpOnly), con login, registro, OAuth, recuperación de contraseña, guardado de puntuación, `/perfil` (usuario, contraseña, borrar cuenta) y contacto con Resend, con paridad funcional con Next.

---

## Por qué existe esta spec

Tercera de las seis specs de migración (24-29). La SPEC 25 dejó en `angular/` todas las pantallas públicas, pero sin sesión: login y contacto son solo UI ("Disponible próximamente"), el jugador es siempre invitado, y `/perfil` y `/auth/*` dan 404. Esta spec cierra esa brecha para que Angular tenga la misma funcionalidad que Next antes del staging (SPEC 27).

**Diferencia clave con Next.** Next hace parte de la auth en el navegador con `supabase-js` (sesión, `updateUsername`, OAuth, recuperación, `insert` en `scores`). En Angular el navegador **nunca habla con Supabase** (decisión de la SPEC 24): toda la auth y la escritura pasan por `/api/*` del Express del SSR, con la sesión en cookies httpOnly gestionadas por `@supabase/ssr`. Esto prepara la SPEC 22/23 (Neon), donde el navegador tampoco hablará con la BD.

Next sigue desplegado hasta la SPEC 28. Se mantiene la **congelación de la UI** de la SPEC 24.

---

## Alcance

**Dentro:**

- **Dependencias** en `angular/`: `@supabase/ssr` (cookies con `parseCookieHeader`/`serializeCookieHeader`; sin `cookie-parser`) y `resend`. Consultar ctx7 antes de usar sus APIs.
- **Variables de entorno** (`angular/.env`, ignorado; solo servidor). Se suman a `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`:
  - `SUPABASE_SECRET_KEY` (solo para `auth.*` y `auth.admin`, nunca para `.from()`/`.rpc()` de datos, salvo `email_for_username` con el cliente admin).
  - `SITE_URL`: origen público sin `/` final. Fija `emailRedirectTo`, `redirectTo` de OAuth y el `Origin` permitido. En dev `http://localhost:4200`; **obligatoria en producción** (si falta, el servidor no arranca).
  - `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (mismos nombres que Next).
  - Se añade `angular/.env.example` con los nombres y valores vacíos o de ejemplo, sin secretos (en Next no existe plantilla).
- **Clientes Supabase de servidor** (`angular/src/server/supabase.ts`):
  - `createSessionClient(req, res)`: clave publicable + cookies leídas de `req` y escritas en `res` (`httpOnly`, `SameSite=Lax`, `Secure` en producción, `path=/`).
  - `createAuthActionClient(req, res)`: clave secreta + cabecera `sb-forwarded-for` con la IP del jugador, **solo** para `auth.*` en sign-up/sign-in (SPEC 17).
  - `createAdminClient()`: clave secreta sin sesión; solo `email_for_username` y `auth.admin.deleteUser`.
  - `clientIp(req)`: `x-vercel-forwarded-for`, `x-real-ip`, última entrada de `x-forwarded-for`, si no `null` (SPEC 20).
  - Todas reciben las variables como dependencia (no leen `process.env` dentro) para poder probarlas con cliente falso, igual que `createApiRouter`.
- **Middleware de sesión** (`angular/src/server/session.ts`): en peticiones que no sean estáticos ni `/api/*`, refresca la sesión (`auth.getClaims()`), deja `res.locals.user` (`{ id, name, avatarUrl, hasPassword }`) y, si la ruta está en `PROTECTED_ROUTES` (hoy solo `/perfil`) y no hay sesión, responde **302 a `/login`** copiando las cookies del refresco (paridad con `proxy.ts`). El resto de rutas son públicas (el invitado sigue funcionando).
- **CSRF** (`angular/src/server/csrf.ts`): las peticiones `POST`/`PATCH`/`DELETE` a `/api/*` deben llevar `Origin` igual a `SITE_URL` (si no, 403) y `Content-Type: application/json` (si no, 415). Las cookies son `SameSite=Lax`. Los `GET` nunca cambian estado.
- **API de auth** (`angular/src/server/auth-api.ts`, `createAuthRouter(deps)`):
  - `GET /api/auth/me` → `200 { user: SessionUser | null }`.
  - `POST /api/auth/sign-up` `{ username, email, password }` → valida con `lib/auth-validation.ts`, comprueba usuario libre en `profiles`, `signUp` con `emailRedirectTo = SITE_URL/auth/callback` y `data.username`. Respuesta `{ needsConfirmation, email }`.
  - `POST /api/auth/sign-in` `{ identifier, password }` → si no hay `@`, resuelve el email con `email_for_username` (admin); usuario desconocido y contraseña incorrecta dan el **mismo** mensaje (sin enumeración). `signInWithPassword` con cookies de sesión.
  - `POST /api/auth/sign-out` → `signOut()` y borra las cookies.
  - `POST /api/auth/forgot-password` `{ email }` → `resetPasswordForEmail` con `redirectTo = SITE_URL/auth/reset-password`. Respuesta siempre `204` si el email es válido (no revela si existe).
  - `POST /api/auth/recovery` `{ code, password }` → canjea el código de recuperación (`exchangeCodeForSession`) y fija la nueva contraseña (`updateUser`) en una sola llamada; mapea `same_password` y `weak_password`.
  - Errores mapeados por **código** (`error.code`), nunca por texto, con los mismos mensajes que Next: `user_already_exists`/`email_exists`, `weak_password`, `over_request_rate_limit` ("Demasiados intentos. Espera unos minutos y vuelve a probar."), `over_email_send_rate_limit`, `email_not_confirmed`, `invalid_credentials`. El mapeo vive en `lib/auth-errors.ts` (ver "Cambio mínimo en `lib/`").
- **Rutas Express de navegación** (no son Angular, como decidió la SPEC 24):
  - `GET /auth/oauth/:provider` (`google` | `github`, otro valor → `/login?error=oauth`): `signInWithOAuth` con `redirectTo = SITE_URL/auth/callback` y redirección 302 a la URL del proveedor. El verificador PKCE queda en la cookie del servidor.
  - `GET /auth/callback`: misma lógica que `app/auth/callback/route.ts`. Sin `code` o con `?error` → `/login?error=oauth`; `exchangeCodeForSession`; fallo `pkce_code_verifier_not_found` (por `error.code` o `AuthPKCECodeVerifierMissingError`) → `/login?confirmed=1`; otro fallo → `/login?error=oauth`; éxito → `/`.
- **API de perfil** (`angular/src/server/profile-api.ts`, `createProfileRouter(deps)`; el usuario sale **siempre** de `getUser()`, nunca del cuerpo):
  - `PATCH /api/profile/username` `{ username }` → valida (`A-Z0-9_`, 3-10, mayúsculas), `profiles.update` con RLS; `23505` → "Ese usuario ya existe.".
  - `POST /api/profile/password` `{ current, password, repeat }` → solo con identidad email; valida nueva (SPEC 17), que coincida con `repeat` y difiera de `current`; verifica la actual con `signInWithPassword` (cuenta para el límite por IP); `updateUser`; `signOut({ scope: 'others' })`.
  - `DELETE /api/profile` `{ confirm }` → el username en mayúsculas debe coincidir con `profiles.username` (si no, 400 "El usuario no coincide."); `auth.admin.deleteUser(user.id)` (cascada en `profiles` y `scores`); `signOut({ scope: 'local' })`.
- **Guardado de puntuación:** `POST /api/scores` `{ gameId, score }` → 401 sin sesión; valida `gameId` (`^[a-z0-9-]{1,40}$`, existe en `games`) y `score` entero ≥ 0, recortado a ≤ 1.000.000 (como Next); **`player_name` lo pone el servidor** con el `profiles.username` de la sesión (el cliente no lo envía y no puede falsearlo); `insert` con el cliente de sesión (RLS: `authenticated`, `user_id = auth.uid()` por `default`). Respuesta `201`.
- **Contacto:** `POST /api/contact` `{ name, email, message, website }` → honeypot `website` relleno devuelve éxito falso (como Next); valida con `lib/contact.ts`; envía con Resend (`from` y `to` de entorno, `replyTo` = email del usuario, asunto `[Arcade Vault] Mensaje de ${name}` sin CR/LF, cuerpo de texto plano). Faltan variables → se registra en el log y se responde un error genérico. Sin límite de envíos (paridad con Next; ver Decisiones).
- **Cambio mínimo en `lib/`:** nuevo `lib/auth-errors.ts` (funciones puras que mapean códigos de error de Supabase a mensajes en español), extraído de `app/login/actions.ts` y `app/perfil/actions.ts`, que pasan a importarlo. Razón: esos archivos son Server Actions de Next y no se pueden importar desde Express. Next no cambia de comportamiento. No se toca nada más de `lib/`.
- **Sesión en SSR y cliente (Angular):**
  - `server.ts` pasa `res.locals.user` al motor de Angular (`REQUEST_CONTEXT`); el servidor de Angular lo vuelca en `TransferState`.
  - `SessionService` (`shared/services/session.service.ts`): signals de solo lectura `user` y `loading`. En servidor lee el contexto de la petición; en el navegador lo recupera de `TransferState` y, en rutas `Client` (sin SSR de datos), llama a `GET /api/auth/me`. `refresh()` tras login/logout/borrado. Sin `onAuthStateChange` ni nada de `supabase-js`.
- **Servicios HTTP:** `AuthService` (sign-up, sign-in, sign-out, forgot, recovery), `ProfileService` (username, password, delete), `ContactService` y `ScoresService.submitScore(gameId, score)`. Única vía a `/api/*` mutables.
- **Rutas Angular y render** (`app.routes.ts`, `app.routes.server.ts`):

  | Ruta                    | Modo     | Guard                               |
  | ----------------------- | -------- | ----------------------------------- |
  | `/perfil`               | `Client` | `authGuard` (`canMatch`) → `/login` |
  | `/auth/reset-password`  | `Client` | —                                   |
  | `/login`                | `Client` | `guestGuard` (con sesión → `/`)     |
  | `/auth/callback`        | Express  | no es ruta Angular                  |
  | `/auth/oauth/:provider` | Express  | no es ruta Angular                  |

- **UI nueva o modificada** (mismo DOM y clases que Next, salvo a11y):
  - `shared/components/avatar` (foto de `avatarUrl` solo `https`, `referrerpolicy="no-referrer"`, o iniciales sobre tono estable por hash del nombre; fallback a iniciales si la imagen falla) y `shared/components/account-menu` (avatar + nombre; `aria-haspopup="menu"`; cierra con `Esc` y clic fuera; ítems "Perfil" y "Cerrar sesión"; en móvil solo el avatar).
  - `NavComponent`: con sesión muestra `account-menu`; sin sesión, "Iniciar Sesión". El panel móvil replica ambos estados.
  - `auth-form`: envía de verdad (registro con aviso de email de confirmación; login por email o usuario); tras login/registro con sesión hace navegación completa a `/` para releer cookies y sesión SSR. Google/GitHub navegan a `/auth/oauth/:provider`. `forgot-password` llama a `AuthService`. "Jugar como invitado" → `/` (paridad con Next; en la SPEC 25 iba a `/juegos`, se corrige aquí).
  - `auth/pages/reset-password-page` + `auth/components/reset-password-form`: lee `?code`; sin código → error + enlace a `/login`; con código muestra el formulario y envía a `/api/auth/recovery`. No consume el código al cargar (se canjea al enviar), a diferencia de Next, para no depender de estado en el navegador.
  - Nueva funcionalidad `profile/`: `pages/profile-page`, `components/{profile-form, password-section, danger-zone}`. Avatar 88, cambio de usuario (`maxlength=10`, botón deshabilitado si no cambia), "Cambiar contraseña" desplegable (solo con identidad email), "Zona peligrosa" → modal "Eliminar cuenta" (escribir el username; si no coincide, error al pulsar ELIMINAR; `Esc` cierra; foco atrapado y devuelto al abrir/cerrar), SALIR (`history.back`, o `/`) y CERRAR SESIÓN. Tras borrar → `/?cuenta=eliminada`.
  - `home/components/account-deleted-notice`: aviso "Cuenta eliminada. Tus datos y puntuaciones se han borrado." con botón de descartar (`role="status"`).
  - `game-player`: nombre del HUD = `user.name` (`—` mientras `loading`, `INVITADO` sin sesión); al terminar con sesión llama a `ScoresService.submitScore` una vez por partida con estados guardando / guardado / error (con reintento); sin sesión mantiene el aviso "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" (SPEC 18).
  - `hall-of-fame-page`: con sesión, "▸ TU MEJOR MARCA EN {título}" si hay fila con `user.name.toUpperCase().slice(0, 10)` (misma lógica que Next).
  - `contact-form`: envía a `ContactService`; éxito → mensaje de enviado y formulario vacío; error → mensaje genérico.
- **Seguridad en el repo:** `scripts/check-secret-client.mjs` incluye `angular/src` (el cliente de clave secreta de `angular/src/server/supabase.ts` no puede usarse con `.from(`/`.rpc(`, salvo `createAdminClient` para `email_for_username`, y nada de `SUPABASE_SECRET_KEY`/`RESEND_API_KEY` en `angular/dist/**/browser`). Se actualiza `references/security/security-checklist.md`.
- **Supabase dev (manual, fuera de código):** añadir `http://localhost:4200/auth/callback` y `http://localhost:4200/auth/reset-password` a las Redirect URLs; Google y GitHub ya están activos desde la SPEC 16. Producción: SPEC 27-28.
- **Docs:** `CLAUDE.md` (sección "App Angular": endpoints, variables, estado de la migración; actualizar el listado de specs) y `README.md`.

**Fuera (specs futuras):**

- Límite de envíos del contacto o de intentos de login, CSP y HSTS (spec de seguridad futura).
- Cookies de sesión compartidas entre Next y Angular: en dev las sesiones son independientes (otro puerto y otro nombre de cookie), el usuario inicia sesión en cada app.
- Despliegue en Vercel y variables de entorno en la nube (SPEC 27), cambio de producción (SPEC 28), retirada de Next y tooling (SPEC 29).
- Migración a Neon (SPEC 22/23, se reescriben después).
- Contraste de `globals.css` (deuda de la SPEC 25) y `h1` de login/detalle.
- Tests e2e automatizados.

---

## Modelo de datos

Sin migraciones ni tablas nuevas. Se reutilizan `profiles`, `scores` y las policies de las migraciones `0010`-`0013`.

```ts
// angular/src/app/shared/models/session.ts
export interface SessionUser {
  id: string;
  name: string; // profiles.username, "PLAYER" si falta
  avatarUrl: string | null; // solo https
  hasPassword: boolean; // app_metadata.providers incluye "email"
}

// angular/src/app/shared/services/session.service.ts
readonly user: Signal<SessionUser | null>;
readonly loading: Signal<boolean>;
refresh(): Promise<void>;

// angular/src/app/shared/services/auth.service.ts
signUp(input): Observable<{ needsConfirmation: boolean; email: string }>;
signIn(input): Observable<void>;
signOut(): Observable<void>;
forgotPassword(email: string): Observable<void>;
recover(code: string, password: string): Observable<void>;

// angular/src/app/shared/services/scores.service.ts (se amplía)
submitScore(gameId: string, score: number): Observable<void>;
```

```
GET    /api/auth/me                → 200 { user }
POST   /api/auth/sign-up           → 201 | 400 | 409 | 429
POST   /api/auth/sign-in           → 204 | 400 | 401 | 429
POST   /api/auth/sign-out          → 204
POST   /api/auth/forgot-password   → 204 | 400 | 429
POST   /api/auth/recovery          → 204 | 400
PATCH  /api/profile/username       → 200 { name } | 400 | 401 | 409
POST   /api/profile/password       → 204 | 400 | 401 | 429
DELETE /api/profile                → 204 | 400 | 401
POST   /api/scores                 → 201 | 400 | 401 | 404 | 500
POST   /api/contact                → 204 | 400 | 500
GET    /auth/oauth/:provider       → 302 (proveedor | /login?error=oauth)
GET    /auth/callback              → 302 (/ | /login?error=oauth | /login?confirmed=1)
```

Los errores devuelven `{ error: string }` con el mensaje ya en español. Toda `/api/*` desconocida sigue dando 404 JSON.

Variables nuevas (solo servidor SSR, `angular/.env`): `SUPABASE_SECRET_KEY`, `SITE_URL`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.

---

## Diseño de clases

Estructura de la skill `angular:angular-conventions`. Alias nuevo en `angular/tsconfig.json`: `@profile/*`.

- **Servidor (`angular/src/server/`)** — cada módulo exporta una factoría que recibe sus dependencias:
  - `supabase.ts` — clientes y `clientIp`; sin rutas.
  - `session.ts` — middleware de sesión y `PROTECTED_ROUTES`; sin lógica de negocio.
  - `csrf.ts` — comprobación de `Origin` y `Content-Type`.
  - `auth-api.ts`, `profile-api.ts`, y las rutas de scores y contacto (`scores-api.ts`, `contact-api.ts`) — una responsabilidad cada una; `api.ts` (SPEC 25, solo lectura) no cambia.
  - `server.ts` — arranque: carga env, valida `SITE_URL` en producción, monta csrf → session → routers → estáticos → Angular.
- **`shared/`**
  - `services/session.service` — única fuente del usuario actual; no hace HTTP de mutación.
  - `services/{auth,profile,contact}.service` — única vía HTTP a sus endpoints.
  - `guards/{auth,guest}.guard` — `canMatch` funcionales sobre `SessionService`.
  - `components/{avatar, account-menu}` — presentacionales (`input()` de usuario) y `output()` de acciones.
- **`auth/`** — `pages/{login-page, reset-password-page}`; `components/{auth-form, forgot-password, reset-password-form}`.
- **`profile/`** — `pages/profile-page`; `components/{profile-form, password-section, danger-zone}`; las páginas orquestan, los componentes pintan.
- **`home/`** — `components/account-deleted-notice`.
- **`play/`, `hall-of-fame/`, `about/`** — cambios acotados (inyectar `SessionService`/`ScoresService`/`ContactService`), sin piezas nuevas.

---

## Plan de implementación

1. **Infraestructura de sesión en el BFF.**
   - **Acciones:**
     - Instalar `@supabase/ssr` y `resend` en `angular/` (consultar ctx7); crear `angular/.env.example` y ampliar `angular/.env` (local, sin commitear).
     - Crear `server/supabase.ts`, `server/session.ts` y `server/csrf.ts`; `server.ts` valida `SITE_URL` y monta csrf y sesión antes de los routers.
     - Crear `GET /api/auth/me` y pasar `res.locals.user` a Angular (`REQUEST_CONTEXT`); crear `SessionService`, `models/session.ts` y `authGuard`/`guestGuard`.
     - Specs: `clientIp` (orden de cabeceras), csrf (Origin ok/distinto/ausente, content-type), middleware de sesión (302 en `/perfil` sin sesión, cookies copiadas, público sin sesión), `/api/auth/me` con cliente falso, `SessionService` (servidor, `TransferState`, `me`, `refresh`), guards.
   - **Verificaciones:**
     - `curl -i localhost:4200/perfil` → 302 con `Location: /login`; `curl -i localhost:4200/` → 200 sin redirección.
     - `curl -i -X POST localhost:4200/api/auth/sign-out -H "Origin: http://evil.test"` → 403; sin `Content-Type: application/json` → 415.
     - `curl localhost:4200/api/auth/me` → `{"user":null}`.
     - Con el dev server de `ng serve`, las rutas Express de `server.ts` y `res.locals` llegan a `REQUEST_CONTEXT` (comprobado; si no, se documenta servir el build).
     - `cd angular && ng test --watch=false` y `ng lint` OK; en la raíz `npm run lint && npm run build` OK.

2. **Login, registro, cierre de sesión y nav con cuenta.**
   - **Acciones:**
     - Crear `lib/auth-errors.ts` y hacer que `app/login/actions.ts` y `app/perfil/actions.ts` lo importen (sin cambio de comportamiento en Next).
     - Crear `server/auth-api.ts` con `sign-up`, `sign-in` y `sign-out`; `AuthService`.
     - Crear `avatar` y `account-menu`; actualizar `NavComponent` (escritorio y panel móvil) y `auth-form` (envío real, aviso de confirmación, navegación completa a `/`, invitado → `/`); aplicar `guestGuard` a `/login`.
     - Specs: `auth-api` (códigos, mapeo por `error.code`, sin enumeración, `needsConfirmation`, rate limit, IP reenviada), `AuthService`, `avatar` (tono estable, iniciales, fallback), `account-menu` (abrir/cerrar, `Esc`, clic fuera, foco), `nav` con y sin sesión, `auth-form`.
   - **Verificaciones:**
     - Registro de una cuenta de prueba en dev muestra "revisa tu correo" y no crea sesión; tras confirmar y entrar por email o por usuario, el nav muestra avatar y nombre y el HTML SSR de `/` ya lo trae.
     - Usuario inexistente y contraseña incorrecta devuelven el mismo mensaje; la cookie de sesión es `httpOnly` (DevTools → Application).
     - "Cerrar sesión" vuelve al nav de invitado; `/login` con sesión redirige a `/`.
     - `npm run lint && npm run build` en la raíz OK (Next intacto).

3. **OAuth, callback y recuperación de contraseña.**
   - **Acciones:**
     - Crear `GET /auth/oauth/:provider` y `GET /auth/callback`; `forgot-password` y `POST /api/auth/forgot-password` y `/api/auth/recovery`.
     - Crear `reset-password-page` y `reset-password-form`; rutas `Client` de `/auth/reset-password`; avisos `?error=oauth` y `?confirmed=1` ya existentes en `login-page` siguen funcionando.
     - Specs: rutas de callback (sin `code`, `?error`, éxito, PKCE por `error.code`, otro fallo, proveedor inválido), `recovery` (códigos, `same_password`, `weak_password`), `forgot-password`, `reset-password-form` (sin código, válido, errores).
   - **Verificaciones:**
     - "Continuar con Google" y "Continuar con GitHub" completan el flujo en dev y vuelven a `/` con sesión; la URL de retorno usa `SITE_URL`, nunca el `Origin` de la petición.
     - Abrir `/auth/callback` sin parámetros → `/login?error=oauth`; con un `code` inválido → `/login?error=oauth`.
     - El email de recuperación llega, el enlace abre `/auth/reset-password?code=…`, la nueva contraseña permite entrar y el mismo enlace usado dos veces da error.
     - `curl -i localhost:4200/auth/oauth/xx` → `/login?error=oauth`.

4. **Guardado de puntuación y sesión en reproductor y salón.**
   - **Acciones:**
     - Crear `POST /api/scores` y `ScoresService.submitScore`.
     - Actualizar `game-player` (nombre del HUD, guardado una sola vez por partida, estados guardando/guardado/error con reintento, invitado sin cambios) y `hall-of-fame-page` ("tu mejor marca").
     - Specs: `scores-api` (401, `gameId` inválido o inexistente, `score` negativo o no entero, clamp, `player_name` del servidor ignorando uno enviado por el cliente), `game-player` (con sesión guarda una vez; invitado no llama; error y reintento), salón con y sin marca.
   - **Verificaciones:**
     - Jugar una partida con sesión guarda una fila en `scores` con `user_id` y `player_name` = username (`execute_sql` en dev, solo `SELECT`); aparece en el detalle y en el salón con "tu mejor marca".
     - `curl -i -X POST localhost:4200/api/scores -H "Origin: http://localhost:4200" -H "Content-Type: application/json" -d '{"gameId":"snake","score":10}'` sin sesión → 401.
     - Un `score` de 5.000.000 se guarda como 1.000.000; un `player_name` en el cuerpo se ignora.
     - Como invitado se ve el aviso y no se guarda nada.

5. **Perfil.**
   - **Acciones:**
     - Crear `server/profile-api.ts` (usuario, contraseña, borrar) y `ProfileService`.
     - Crear la funcionalidad `profile/` y el alias `@profile/*`; ruta `/perfil` con `authGuard` y modo `Client`; `account-deleted-notice` en la home.
     - Specs: `profile-api` (id solo de `getUser()`, `23505`, solo identidad email, contraseña igual a la actual, repetición distinta, confirmación no coincide, borrado y `signOut` local), `profile-form`, `password-section`, `danger-zone` (foco, `Esc`, error de confirmación), `profile-page`, `account-deleted-notice`.
   - **Verificaciones:**
     - `/perfil` sin sesión → 302 a `/login`; con sesión muestra avatar y usuario; cambiar usuario actualiza el nav y las puntuaciones antiguas conservan su `player_name`.
     - Cambiar contraseña cierra las demás sesiones (otro navegador pierde la sesión) y una contraseña actual errónea no la cambia.
     - Eliminar una cuenta de prueba con un username que no coincide → error; con el correcto → `/?cuenta=eliminada` con aviso, y `auth.users`, `profiles` y `scores` sin filas de ese usuario (`SELECT` en dev).
     - Cuenta OAuth sin contraseña no muestra "Cambiar contraseña".

6. **Contacto con Resend.**
   - **Acciones:**
     - Crear `server/contact-api.ts` y `ContactService`; conectar `contact-form`.
     - Specs: `contact-api` (validación, honeypot con éxito falso y sin envío, asunto sin CR/LF, `replyTo`, variables ausentes → 500 genérico, Resend con cliente falso), `contact-form` (éxito, error, validación).
   - **Verificaciones:**
     - Enviar el formulario de `/about` entrega el email al destino de `CONTACT_TO_EMAIL` con `reply-to` del remitente (Resend, entorno dev).
     - Con `website` relleno devuelve éxito y no llega ningún email.
     - Sin `RESEND_API_KEY` → mensaje de error genérico y traza en el log del servidor.

7. **Seguridad, paridad y docs.**
   - **Acciones:**
     - Adaptar `scripts/check-secret-client.mjs` a `angular/src`; actualizar `references/security/security-checklist.md`.
     - Lanzar el agente `security-auditor` (BD y app) y corregir lo que encuentre dentro del alcance; checklist visual contra `:3000` de nav con cuenta, perfil y modal; pasada de accesibilidad (teclado, foco, axe) en `/login`, `/perfil` y `/auth/reset-password`.
     - Actualizar `CLAUDE.md` y `README.md` (incluido el listado de specs y el estado de la migración); Estado → Implementado.
   - **Verificaciones:**
     - `npm run check:secret-client` falla con un uso `.from(` de prueba del cliente de clave secreta en `angular/src/server` y pasa sin él.
     - `grep -r "SUPABASE_SECRET_KEY\|RESEND_API_KEY" angular/dist/**/browser` sin resultados.
     - `cd angular && ng build && ng test --watch=false && ng lint` OK; en la raíz `npm run lint && npm run build && npm run check:secret-client` OK.
     - Axe (Playwright) sin violaciones serias o críticas en las pantallas nuevas (la deuda de contraste de la SPEC 25 consta como aceptada).
     - `CLAUDE.md` y `README.md` mencionan SPEC 26 y están sincronizados.

Un commit por paso (`26-angular-auth-guardado-y-contacto: Paso N`); los `.spec.ts` van en el mismo paso que su pieza.

---

## Plan de tests

| Pieza                                                 | Casos principales                                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clientIp`                                            | orden `x-vercel-forwarded-for` → `x-real-ip` → última de `x-forwarded-for` → `null`                                                                  |
| `csrf`                                                | `Origin` correcto, distinto y ausente (403); content-type no JSON (415); `GET` sin comprobación                                                      |
| `session` (middleware)                                | `/perfil` sin sesión → 302 con cookies copiadas; con sesión pasa; ruta pública sin sesión pasa; `res.locals.user`                                    |
| `auth-api`                                            | sign-up (existente, débil, rate limit, `needsConfirmation`); sign-in (usuario/contraseña mismo mensaje, no confirmado); recovery; forgot siempre 204 |
| `callback` / `oauth`                                  | sin `code`, `?error`, éxito, PKCE por código, otro fallo, proveedor inválido                                                                         |
| `profile-api`                                         | id solo de `getUser()`; `23505`; sin identidad email; reautenticación; confirmación; `signOut` others/local                                          |
| `scores-api`                                          | 401; `gameId` inválido/inexistente; `score` inválido; clamp; `player_name` del servidor                                                              |
| `contact-api`                                         | validación; honeypot; asunto sin CR/LF; `replyTo`; sin variables; fallo de Resend                                                                    |
| `SessionService`                                      | servidor, `TransferState`, `me`, `refresh`, estados `loading`                                                                                        |
| Guards                                                | con/sin sesión, mientras `loading`                                                                                                                   |
| `avatar`, `account-menu`, `nav`                       | tono estable, iniciales, fallback; abrir/cerrar, `Esc`, clic fuera, foco; nav con y sin sesión                                                       |
| `auth-form`, `forgot-password`, `reset-password-form` | validaciones, errores del servidor, `aria-invalid`/`aria-describedby`, navegación a `/`                                                              |
| `profile-*`, `danger-zone`                            | cambio de usuario, contraseña (solo email), modal (foco, `Esc`, confirmación), borrado                                                               |
| `game-player`                                         | guarda una vez con sesión; invitado no llama; error y reintento                                                                                      |
| `hall-of-fame-page`                                   | "tu mejor marca" con y sin fila                                                                                                                      |
| `contact-form`, servicios                             | éxito, error, validación; URL y cuerpo; propagación de errores                                                                                       |

La lógica ya compartida de `lib/` (`auth-validation`, `contact`) no se re-testea; `lib/auth-errors.ts` es nueva y se prueba con sus casos (un caso por código).

---

## Criterios de aceptación

- [ ] Registro, login (email o usuario), cierre de sesión, Google/GitHub y recuperación de contraseña funcionan en `:4200`; el navegador solo llama a `/api/*` y a las rutas Express de navegación, nunca a Supabase.
- [ ] La sesión vive en cookies `httpOnly`, `SameSite=Lax` (`Secure` en producción); el HTML SSR de las páginas ya trae el nav con la cuenta.
- [ ] Todo `POST`/`PATCH`/`DELETE` de `/api/*` con `Origin` distinto de `SITE_URL` da 403.
- [ ] `/perfil` sin sesión → 302 real a `/login`; `/login` con sesión → `/`.
- [ ] Con sesión, la puntuación se guarda con `player_name` del servidor y `user_id` de la sesión; el invitado ve el aviso y no guarda; un `score` > 1.000.000 se recorta.
- [ ] Usuario inexistente y contraseña incorrecta dan el mismo mensaje; los errores se mapean por código.
- [ ] Perfil: cambio de usuario, cambio de contraseña (solo identidad email, cierra las demás sesiones) y borrar cuenta (confirmación por username, cascada) con el mismo comportamiento que Next.
- [ ] Contacto envía por Resend con honeypot y validación de `lib/contact.ts`; sin variables, error genérico y traza en servidor.
- [ ] `SUPABASE_SECRET_KEY` y `RESEND_API_KEY` no aparecen en `angular/dist/**/browser`; `npm run check:secret-client` cubre `angular/src` y pasa.
- [ ] Salón: "tu mejor marca" con sesión; nav con avatar y menú de cuenta; aviso `?cuenta=eliminada`.
- [ ] Aspecto equivalente a Next en nav con cuenta, perfil, modal y menú, escritorio y 390×844.
- [ ] El único cambio en `lib/` es `lib/auth-errors.ts` y su uso en las Server Actions; la app Next compila, pasa lint y se comporta igual.
- [ ] **Accesibilidad (WCAG 2.2 AA):**
  - [ ] Menú de cuenta con `aria-haspopup="menu"`, `aria-expanded`, `Esc` cierra y devuelve el foco, navegación con teclado.
  - [ ] Modal "Eliminar cuenta" con `role="dialog"`, `aria-modal`, nombre accesible, foco atrapado, `Esc` cierra y el foco vuelve al botón que lo abrió.
  - [ ] Formularios con `<label>`, `aria-invalid` y `aria-describedby`; errores con `role="alert"`, avisos de éxito con `role="status"`.
  - [ ] Avatar con `alt` vacío si el nombre ya está al lado, o texto alternativo en caso contrario.
  - [ ] Objetivos táctiles ≥24×24 px y foco visible.
  - [ ] axe sin violaciones serias en `/login`, `/perfil` y `/auth/reset-password` (salvo la deuda de contraste ya aceptada de la SPEC 25).
- [ ] Cada pieza nueva tiene su `.spec.ts`.
- [ ] `cd angular && ng build && ng test --watch=false && ng lint` pasa; en la raíz `npm run lint && npm run build && npm run check:secret-client` siguen OK.
- [ ] `CLAUDE.md` y `README.md` actualizados.

---

## Decisiones

- **Sí:** una sola spec para todo lo de sesión (ya lo fijaba la SPEC 24). Razón: auth, guardado, perfil y contacto comparten infraestructura (cookies, CSRF, clientes); partirla obligaría a renumerar 27-29.
- **Sí:** sesión en el BFF con cookies httpOnly y `@supabase/ssr`, sin `supabase-js` en el navegador. Razón: cumple "el navegador nunca habla con Supabase" (SPEC 24), el token no es accesible desde JS (XSS) y la SPEC 22/23 no tendrá que deshacer nada.
- **Sí:** OAuth y recuperación se inician en servidor (rutas Express) y la recuperación canjea el código al enviar. Razón: el verificador PKCE debe vivir donde se genera y se canjea; con el BFF es la cookie del servidor.
- **Sí:** el servidor resuelve el usuario y lo pasa a Angular (`REQUEST_CONTEXT` + `TransferState`). Razón: el nav SSR sale correcto sin parpadeo y sin una segunda petición al hidratar.
- **Sí:** CSRF con `SameSite=Lax` + comprobación de `Origin` y solo JSON. Razón: equivale a lo que hace Next con Server Actions y es suficiente con cookies same-site; el doble envío de token añade piezas sin ganancia clara. Se reevalúa si se admiten orígenes múltiples (SPEC 27).
- **Sí:** `SITE_URL` fija para `emailRedirectTo`, OAuth y el `Origin` permitido; obligatoria en producción. Razón: SPEC 20 (nunca derivarlo de `Origin`/`Host`). Mejora sobre Next, cuyo OAuth usa `window.location.origin`.
- **Sí:** `player_name` lo pone el servidor desde `profiles`. Razón: el cliente no puede suplantar a otro jugador; es más estricto que Next (que lo envía el navegador con RLS solo sobre `user_id`).
- **Sí:** `/perfil` con 302 en Express y `authGuard`. Razón: paridad con `proxy.ts` y sin flash del shell; el guard cubre la navegación en cliente.
- **Sí:** contacto con paridad (honeypot y validación, sin límite). Razón: no ampliar el alcance; el límite por IP va a una spec de seguridad con el de login.
- **Sí:** `lib/auth-errors.ts` como único cambio en `lib/`. Razón: los mapeos de error estaban dentro de Server Actions de Next y se necesitan en Express.
- **Sí:** sesiones de Next y Angular independientes en dev. Razón: puertos y cookies distintos; compartirlas no aporta hasta que haya una sola app.
- **Sí:** "Jugar como invitado" → `/` (paridad con Next). Razón: la SPEC 25 lo envió a `/juegos`; se corrige aquí.
- **No:** `onAuthStateChange`/`supabase-js` en el navegador. Razón: ver primera decisión de sesión.
- **No:** rate limit propio, CSP y HSTS. Razón: fuera de alcance; Supabase ya limita sign-up/sign-in por IP (SPEC 17).
- **No:** endpoint para listar o revocar sesiones. Razón: Next no lo tiene; el cambio de contraseña ya cierra las demás.

---

## Riesgos

| Riesgo                                                                                      | Mitigación                                                                                                       |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ng serve` no pasa `res.locals`/`REQUEST_CONTEXT` o no ejecuta el middleware de `server.ts` | Comprobar en el paso 1 con ctx7; alternativa: servir el build y documentarlo                                     |
| `@supabase/ssr` en Express (cookies en `req`/`res`) distinto de Next (`next/headers`)       | Capa fina en `supabase.ts` con `getAll`/`setAll`; probar refresco y borrado de cookies; ctx7 antes del paso 1    |
| Verificador PKCE perdido (otro navegador, cookie expirada)                                  | Rama `?confirmed=1` por `error.code`, como Next; verificado en el paso 3                                         |
| Fuga de la clave secreta al bundle o uso de `createAuthActionClient` para datos             | Módulo solo en `src/server`, `check:secret-client` ampliado y `grep` del `dist` en el paso 7                     |
| `SITE_URL` mal configurada rompe OAuth, correos y CSRF                                      | El servidor no arranca sin ella en producción; Redirect URLs de Supabase documentadas; verificación en el paso 3 |
| Falsos 403 por proxies que cambian `Origin` (Vercel, túneles de dev)                        | `Origin` contra `SITE_URL` configurable; probar en staging (SPEC 27)                                             |
| El TransferState del usuario se sirve cacheado y muestra la cuenta equivocada               | Respuestas con sesión `Cache-Control: private, no-store`; no cachear HTML de rutas `Server` con cookie           |
| Límite por IP de Supabase (10/5 min) agota las pruebas en dev                               | Reutilizar cuentas de prueba; documentar el mensaje esperado `over_request_rate_limit`                           |
| Borrar una cuenta equivocada                                                                | Id solo de `getUser()`, confirmación por username y pruebas con cuentas de usuario de prueba, nunca con la real  |
| Spec grande (7 pasos)                                                                       | Cada paso es commiteable; si se alarga, mover contacto (paso 6) a una spec propia                                |
| Doble mantenimiento de la UI durante 24-29                                                  | Congelación de UI de la SPEC 24 sigue vigente                                                                    |

---

## Qué **no** entra en esta spec

- Límite de envíos del contacto o de intentos de login, CSP y HSTS.
- Cookies de sesión compartidas entre Next y Angular.
- Despliegue, cambio de producción y retirada de Next (SPEC 27-29).
- Neon (SPEC 22/23), CSS por componente, contraste de `globals.css` y tests e2e.

Cada uno, si llega, va en su propia spec.
