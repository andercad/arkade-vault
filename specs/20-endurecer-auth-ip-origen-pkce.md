# SPEC 20 — Endurecer la autenticación: IP real, origen fijo y error PKCE por código

> **Estado:** Implementado
>
> **Depende de:** SPEC 16 (autenticación), SPEC 17 (medidas de seguridad), SPEC 19 (perfil: contraseña y borrar cuenta)
> **Fecha:** 2026-11-24
> **Objetivo:** Cerrar los hallazgos de la revisión de seguridad de auth: tomar la IP del jugador de cabeceras fiables de Vercel, fijar el origen del enlace de confirmación con `NEXT_PUBLIC_SITE_URL` y detectar el fallo PKCE del callback por código de error en vez de por texto.

---

## Por qué existe esta spec

Revisión manual del código de auth (2026-11-24) detectó:

- `clientIp()` (`lib/supabase/server.ts`) toma la primera entrada de `x-forwarded-for`, que el cliente puede falsificar. Si cambia la IP en cada petición, evade el rate limit de Auth (SPEC 17).
- `siteOrigin()` (`app/login/actions.ts`) construye `emailRedirectTo` con `Origin`/`x-forwarded-host`/`Host` de la petición. Un `Host` manipulado podría apuntar el enlace de confirmación a otro dominio (Supabase lo limita a las Redirect URLs permitidas, pero no hay que depender de eso).
- `app/auth/callback/route.ts` detecta "otro navegador" con una regex sobre `error.message` (`/code verifier/i`). Si el SDK cambia el texto, el flujo `?confirmed=1` se rompe sin avisar.
- `createAuthActionClient` usa la clave secreta (salta RLS) solo para reenviar la IP. SPEC 17 lo aceptó; falta un control automático de que no se use para datos.
- `signUp` revela si un usuario o correo ya existe. Compromiso de UX, sin decisión escrita.

## Alcance

**Dentro:**

- `lib/supabase/server.ts`: `clientIp()` pasa a leer, por orden, `x-vercel-forwarded-for`, `x-real-ip` y la **última** entrada de `x-forwarded-for` (la que añade el proxy de confianza); sin ninguna → `null` (sin cabecera `sb-forwarded-for`). Se descarta la primera entrada.
- `app/login/actions.ts`: `siteOrigin()` lee `process.env.NEXT_PUBLIC_SITE_URL`; en desarrollo (`NODE_ENV !== "production"`) sin la variable → `http://localhost:3000`; en producción sin la variable → error de servidor (mismo patrón que `SUPABASE_SECRET_KEY`), nunca se usa `Origin`/`Host`. Se normaliza sin barra final.
- `app/auth/callback/route.ts`: detectar la falta de verificador PKCE por `error.code`/`error.name` (valor exacto confirmado contra el SDK instalado y su doc), no por regex sobre `message`.
- Control automático de uso de la clave secreta: script o regla que falla si `createAuthActionClient` se usa fuera de llamadas `auth.*` (`.from(`/`.rpc(`) en `app/` y `lib/`; ejecutable con un comando documentado.
- Documentar la decisión de enumeración en `signUp` (se mantiene) en Decisiones, `references/security/security-checklist.md` y `.claude/agents/security-auditor.md` (como riesgo aceptado, no como hallazgo nuevo).
- Variable `NEXT_PUBLIC_SITE_URL` documentada en `references/deploy/prod-runbook.md`, `README.md` y `CLAUDE.md` (env); `.env.example` si existe.
- Docs: `CLAUDE.md` + `README.md` (SPEC 20), checklist de seguridad.

**Fuera (specs futuras):**

- Cambiar `createAuthActionClient` a la clave publicable (se mantiene la clave secreta, decisión de SPEC 17).
- Mensajes genéricos o anti-enumeración en `signUp`.
- Rate limit propio en la app o CAPTCHA (la fuerza bruta de contraseña sigue limitada solo por Supabase; ver SPEC 19).
- Soporte de otros hostings (Netlify) para la IP.
- Validación de email más estricta, CSP/HSTS, límite propio para `email_for_username`.
- Migraciones de BD (no hay).

---

## Modelo de datos

Sin tablas, columnas ni migraciones nuevas.

```ts
// lib/supabase/server.ts — orden de prioridad de la IP (primera que exista)
// 1. x-vercel-forwarded-for
// 2. x-real-ip
// 3. última entrada de x-forwarded-for
// 4. null → sin cabecera sb-forwarded-for
```

```ts
// app/login/actions.ts
// siteOrigin(): string  ← NEXT_PUBLIC_SITE_URL (sin "/" final)
// dev sin variable → "http://localhost:3000"; prod sin variable → throw
```

Variable de entorno nueva: `NEXT_PUBLIC_SITE_URL` (ej. `https://arcade-vault.vercel.app`, sin barra final). Valor idéntico al de las Redirect URLs de Supabase.

---

## Plan de implementación

1. **IP real del jugador.**
   - Reescribir `clientIp()` en `lib/supabase/server.ts` con el orden de arriba; actualizar el comentario de `createAuthActionClient`.
   - Verificación: `tsc`/`lint` limpios; en dev con `curl -H "x-forwarded-for: 1.1.1.1, 2.2.2.2"` a un login fallido, los logs de Auth (`query_logs` auth) muestran `2.2.2.2` (o `::1`/ausente) y nunca `1.1.1.1`; sin cabeceras, login y registro siguen funcionando; en preview/prod de Vercel, la IP del log coincide con la del jugador y no cambia al falsificar `x-forwarded-for`.
2. **Origen fijo del enlace de confirmación.**
   - `siteOrigin()` en `app/login/actions.ts` con `NEXT_PUBLIC_SITE_URL`; definir la variable en `.env.local` (`http://localhost:3000`); leer `node_modules/next/dist/docs/` si se toca `headers()`.
   - Verificación: registrar un usuario de prueba con `Host`/`Origin` falsificados (Playwright `page.route` o `curl`) → el correo (o `emailRedirectTo` visible en logs de Auth) apunta siempre a `NEXT_PUBLIC_SITE_URL/auth/callback`; sin la variable y `NODE_ENV=production` → error genérico de servidor; el registro normal en dev sigue enviando el correo.
3. **Error PKCE por código en el callback.**
   - `app/auth/callback/route.ts`: comparar `error.code` (o `error.name`) con el valor del SDK; mantener la regex solo si el SDK no expone código estable (decidir tras consultar la doc de `@supabase/supabase-js` con Context7).
   - Verificación: `tsc`/`lint` limpios; abrir un enlace de confirmación en otro navegador (sin cookie de verificador) → `/login?confirmed=1`; código inválido o caducado → `/login?error=oauth`; OAuth y confirmación en el mismo navegador → `/`.
4. **Control de uso de la clave secreta.**
   - Script (p. ej. `scripts/check-secret-client.mjs` o regla ESLint) que falla si, en un archivo que importa `createAuthActionClient`, la variable resultante llama a `.from(` o `.rpc(`; añadir comando a `package.json`.
   - Verificación: el comando pasa con el código actual; introducir temporalmente `authClient.from("scores")` en `app/login/actions.ts` → falla; revertir.
5. **Docs y cierre.**
   - `references/deploy/prod-runbook.md` (variable `NEXT_PUBLIC_SITE_URL` en Vercel), `references/security/security-checklist.md` (IP de cabecera fiable, origen fijo, enumeración aceptada, check de clave secreta), `.claude/agents/security-auditor.md`, `CLAUDE.md`, `README.md`; Estado → Implementado.
   - Verificación: `npm run build` OK; los archivos mencionan SPEC 20; grep de `SUPABASE_SECRET_KEY` y `createAdminClient` solo en archivos `server-only`/Server Actions; todos los criterios marcados.

Un commit por paso (`20-endurecer-auth-ip-origen-pkce: Paso N`). Al final, proponer `security-auditor` (toca auth), sin lanzarlo sin confirmación.

---

## Criterios de aceptación

- [x] `clientIp()` no usa la primera entrada de `x-forwarded-for`; falsificar esa cabecera no cambia la IP vista en los logs de Auth.
- [x] Sin ninguna cabecera de IP, `signUp`/`signIn` siguen funcionando (sin `sb-forwarded-for`).
- [x] `emailRedirectTo` es siempre `${NEXT_PUBLIC_SITE_URL}/auth/callback`, con `Origin`/`Host` falsificados.
- [x] En producción sin `NEXT_PUBLIC_SITE_URL`, el registro falla con error de servidor (no cae a `Host`); en desarrollo usa `http://localhost:3000`.
- [x] El callback detecta la falta de verificador PKCE por código de error y redirige a `/login?confirmed=1`; un código inválido va a `/login?error=oauth`.
- [x] El comando de control falla si la clave secreta se usa con `.from(`/`.rpc(` y pasa con el código actual.
- [x] `NEXT_PUBLIC_SITE_URL` aparece en `prod-runbook.md`, `README.md` y `CLAUDE.md`, y está definida en Vercel (verificación manual).
- [x] La enumeración de cuentas en `signUp` consta como riesgo aceptado en checklist y `security-auditor.md`.
- [x] `tsc`, `lint` y `build` limpios; `CLAUDE.md`, `README.md` y checklist actualizados.

---

## Decisiones

- **Sí:** IP desde `x-vercel-forwarded-for` / `x-real-ip` / última entrada de `x-forwarded-for`. Razón: Vercel sobrescribe estas cabeceras; la primera entrada de `x-forwarded-for` la controla el cliente.
- **No:** soporte Netlify. Razón: el despliegue es Vercel (`vercel.json`); si cambia, nueva spec.
- **Sí:** `NEXT_PUBLIC_SITE_URL` obligatoria en prod, fallback solo en dev. Razón: no depender de cabeceras de la petición; fallar fuerte en prod evita enlaces a dominios ajenos.
- **No:** fallback a `Origin` cuando falta la variable. Razón: reabre el hallazgo.
- **Sí:** mantener la enumeración en `signUp`. Razón: UX clara en un proyecto de juegos, sin datos sensibles; `signIn` ya no enumera. Se documenta como riesgo aceptado.
- **No:** mensajes genéricos en `signUp`. Razón: decisión del usuario; empeora la UX sin cambiar el modelo de amenazas de forma relevante aquí.
- **Sí:** mantener la clave secreta en `createAuthActionClient` y añadir control automático. Razón: SPEC 17 ya lo decidió; el riesgo real es el uso indebido, que el control detecta.
- **No:** cambiar a clave publicable. Razón: no hay garantía de que Supabase acepte `sb-forwarded-for` con ella; fuera de alcance.
- **Sí:** detectar PKCE por código de error. Razón: el texto del mensaje puede cambiar entre versiones del SDK.

---

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                                |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cabecera de Vercel con otro nombre o ausente en local                             | Orden de prioridad con fallback; sin IP no se envía `sb-forwarded-for` (el rate limit cuenta el servidor) |
| Falta `NEXT_PUBLIC_SITE_URL` en Vercel tras el despliegue → registro roto en prod | Paso 5 la documenta en el runbook; verificación manual en preview antes del merge                         |
| `NEXT_PUBLIC_SITE_URL` distinta de las Redirect URLs de Supabase                  | Mismo valor que la lista permitida; probar un registro real en preview                                    |
| `error.code` de PKCE no existe en la versión instalada del SDK                    | Paso 3 confirma el valor contra la doc/el SDK; si no es estable, mantener la regex como respaldo          |
| El control de la clave secreta da falsos positivos o negativos                    | Heurística simple por archivo; la revisión con `security-auditor` sigue siendo la red de seguridad        |
| `NEXT_PUBLIC_` expone la URL en el bundle                                         | Es una URL pública; no contiene secretos                                                                  |

---

## Qué **no** entra en esta spec

- Cambiar la clave de `createAuthActionClient`.
- Anti-enumeración en el registro.
- Rate limit propio, CAPTCHA, CSP/HSTS.
- Soporte de otros hostings.

Cada uno, si llega, va en su propia spec.
