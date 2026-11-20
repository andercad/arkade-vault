# SPEC 17 — Medidas de seguridad básicas (BD, Auth y headers)

> **Estado:** Implementado
>
> **Depende de:** SPEC 06 (leaderboard y juegos), SPEC 16 (autenticación)
> **Fecha:** 2026-11-20
> **Objetivo:** Aplicar el checklist de `references/security/security-checklist.md`: cerrar los avisos de seguridad de Supabase, endurecer contraseñas y rate limit de Auth, y enviar headers de seguridad desde Next.js.

---

## Por qué existe esta spec

- `get_advisors` (security) avisa de que `public.rls_auto_enable()` (SECURITY DEFINER) es ejecutable por `anon` y `authenticated` vía `/rest/v1/rpc/rls_auto_enable`.
- La policy `scores insert anónimo` permite que un cliente envíe un `user_id` ajeno (riesgo aceptado en SPEC 16).
- Contraseña mínima de 6 caracteres sin requisitos de complejidad.
- El rate limit de Auth es por IP, pero `signUp`/`signIn` corren en Server Actions: Supabase ve la IP del servidor, compartida por todos los jugadores.
- La app no envía headers de seguridad.

Estado ya correcto (solo se verifica): RLS activo en `games`, `profiles`, `scores`; `game_stats` es vista con `security_invoker = true`, así que aplica el RLS de `games`/`scores`.

## Alcance

**Dentro:**

- Migración `0012_seguridad.sql`: `revoke execute` de `rls_auto_enable()` a `public, anon, authenticated`; recrear la policy de insert de `scores` con check de `user_id`.
- Config Supabase Auth (panel, manual): longitud mínima 8; "Password requirements" = minúsculas, mayúsculas, dígitos y símbolos; rate limit "sign-ups and sign-ins" = 10 por IP cada 5 min; activar "IP Address Forwarding"; intentar leaked password protection (plan Free: no disponible → se documenta).
- `lib/auth-validation.ts`: `MIN_PASSWORD = 8`, regla de complejidad igual a la de Supabase, `PASSWORD_ERROR` nuevo; aplicada en registro y en `/auth/reset-password`.
- Reenvío de IP: cliente Supabase para Server Actions de auth con `SUPABASE_SECRET_KEY` y cabecera `sb-forwarded-for` = IP del jugador; lo usan `signUp` y `signIn`.
- Mensaje en español para `over_request_rate_limit` (429) en `signUp` y `signIn`; `weak_password` con el mensaje de requisitos.
- `next.config.ts`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` en todas las rutas.
- Marcar el checklist en `references/security/security-checklist.md` y actualizar `CLAUDE.md` + `README.md`.
- Protección de rutas con Proxy Next.js (docs: https://nextjs.org/docs/app/getting-started/proxy): `proxy.ts` (ya refresca la sesión, SPEC 16) redirige a `/login` las rutas de la lista `PROTECTED_ROUTES` cuando no hay sesión. Lista inicial: solo `/perfil` (única ruta que hoy exige sesión, con redirección en cliente). El resto sigue público (invitado intacto).

Ejemplo: proxy.ts

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/home", request.url));
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: "/about/:path*",
};
```

**Fuera (specs futuras):**

- Content-Security-Policy, HSTS, Permissions-Policy.
- Leaked password protection (requiere plan Pro).
- Rate limit propio en la app (en memoria/Redis) y CAPTCHA.
- Forzar cambio de contraseña a cuentas existentes con contraseñas débiles.
- Reenvío de IP en `forgot-password`, OAuth y `updateUser` (van desde el navegador: ya usan la IP del jugador).
- Medidor visual de fuerza de contraseña.
- Policies de update/delete en `scores`/`games` (siguen sin existir: denegado por defecto).

---

## Modelo de datos

```sql
-- 0012_seguridad.sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

drop policy "scores insert anónimo" on public.scores;
create policy "scores insert anónimo" on public.scores
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id)
    and (user_id is null or user_id = (select auth.uid()))
  );
```

Sin tablas ni columnas nuevas. Tipos (`database.types.ts`) sin cambios esperados; se regeneran igualmente.

```ts
// lib/auth-validation.ts
export const MIN_PASSWORD = 8;
// Mismo set de símbolos que Supabase: !@#$%^&*()_+-=[]{};'\:"|<>?,./`~
export const PASSWORD_ERROR =
  "La contraseña debe tener al menos 8 caracteres, con minúscula, mayúscula, número y símbolo.";
export function validatePassword(password: string): string | null;
```

```ts
// Cliente para Server Actions de auth (server-only)
// createServerClient(URL, SUPABASE_SECRET_KEY, { cookies, global: { headers: { "sb-forwarded-for": ip } } })
// ip = primera entrada de x-forwarded-for de headers(), o x-real-ip; sin IP → sin cabecera.
```

Ubicación: nueva función exportada en `lib/supabase/server.ts` (`createAuthActionClient`), con `import "server-only"`. Solo para llamadas `auth.*` en `app/login/actions.ts`; nunca para consultas de datos (la clave secreta salta RLS).

---

## Plan de implementación

1. **Migración BD.**
   - `supabase/migrations/0012_seguridad.sql` (modelo de arriba); `apply_migration`; regenerar `lib/supabase/database.types.ts`.
   - Verificación: `list_migrations` incluye 0012; `get_advisors` security sin `anon_/authenticated_security_definer_function_executable`; en transacción con rollback: insert en `scores` como `anon` con `user_id` null → OK; como `anon` con `user_id` de otro → falla RLS; como `authenticated` con su `auth.uid()` → OK; con `user_id` ajeno → falla; crear tabla de prueba en `public` → `relrowsecurity` true (el event trigger `ensure_rls` sigue funcionando).
2. **Config Supabase Auth (manual).**
   - Panel: Minimum password length 8; Password requirements "Lowercase, uppercase letters, digits and symbols"; Rate Limits → sign-ups and sign-ins 10 por 5 min; IP Address Forwarding activado; Leaked password protection: comprobar que no está disponible en Free.
   - Verificación: panel muestra los valores; `get_advisors` sigue mostrando solo `auth_leaked_password_protection` (aceptado); `signUp` directo contra la API con `abcdefgh` → `weak_password`.
3. **Validación de contraseña en la app.**
   - `lib/auth-validation.ts`: `MIN_PASSWORD = 8`, `validatePassword`, `PASSWORD_ERROR` nuevo; `validateSignUp` y `components/reset-password-form.tsx` usan `validatePassword`; `weak_password` en `app/login/actions.ts` y `reset-password-form.tsx` devuelve `PASSWORD_ERROR`.
   - Verificación: tsc/lint limpios; Playwright en `/login` → crear cuenta con `abc12345` muestra `PASSWORD_ERROR` sin llamar a Supabase; `Abcdef1!` pasa la validación; login con cuenta existente de contraseña antigua sigue funcionando.
4. **Reenvío de IP y mensaje 429.**
   - `createAuthActionClient()` en `lib/supabase/server.ts` (clave secreta + `sb-forwarded-for`); `signUp`/`signIn` lo usan; `over_request_rate_limit` → "Demasiados intentos. Espera unos minutos y vuelve a probar.".
   - Verificación: tsc/lint/build limpios; grep del bundle cliente (`.next/static`) sin `sb_secret`; login y registro siguen funcionando con sesión en cookies; 11 logins fallidos seguidos en < 5 min → el 11º muestra el mensaje 429; logs de Auth (`get_logs` auth) muestran la IP del jugador, no la del servidor (o `::1` en local).
5. **Headers de seguridad.**
   - `next.config.ts`: `securityHeaders` + `headers: async () => [{ source: "/(.*)", headers: securityHeaders }]` (leer `node_modules/next/dist/docs/` sobre `headers` antes).
   - Verificación: `curl -I http://localhost:3000/` y `/juegos/asteroids/jugar` muestran los 3 headers; juegos, OAuth (redirección) y avatares siguen funcionando (Playwright).
6. **Protección de rutas con Proxy.**
   - `proxy.ts`: `const PROTECTED_ROUTES = ["/perfil"]`; tras `getClaims()`, si no hay claims y `pathname` es una ruta protegida (o cuelga de ella) → `NextResponse.redirect(new URL("/login", request.url))` copiando a la redirección las cookies que haya fijado el refresco de sesión; actualizar el comentario "No protege rutas". Mantener el `matcher` actual. La redirección en cliente de `components/profile-form.tsx` se queda como respaldo. Leer `node_modules/next/dist/docs/` (proxy) antes.
   - Verificación: tsc/lint limpios; `curl -I http://localhost:3000/perfil` sin cookie → 307 a `/login`; `/`, `/juegos`, `/juegos/asteroids/jugar`, `/salon-de-la-fama`, `/about`, `/login` → 200; Playwright: con sesión `/perfil` carga sin parpadeo ni redirección; cerrar sesión estando en `/perfil` y recargar → `/login`; sesión sigue refrescándose en rutas públicas.
7. **Docs y cierre.**
   - Marcar los items en `references/security/security-checklist.md` (leaked protection marcada como no disponible en Free); `CLAUDE.md` (SPEC 17, migración 0012, `createAuthActionClient`, headers, `proxy.ts` ya protege `/perfil` con `PROTECTED_ROUTES`) + `README.md`; Estado → Implementado.
   - Verificación: `npm run build` OK; ambos archivos mencionan SPEC 17; todos los criterios marcados.

Un commit por paso (`17-medidas-seguridad: Paso N`).

---

## Criterios de aceptación

- [x] `games`, `profiles`, `scores` con RLS activo y `game_stats` con `security_invoker = true`.
- [x] `get_advisors` security no muestra avisos de `rls_auto_enable`; solo queda `auth_leaked_password_protection` (aceptado por plan Free).
- [x] Insertar en `scores` con un `user_id` distinto de `auth.uid()` falla; con `null` (invitado) o el propio funciona.
- [x] El event trigger `ensure_rls` sigue activando RLS en tablas nuevas.
- [x] Registro y reset rechazan contraseñas < 8 o sin minúscula, mayúscula, número y símbolo, con mensaje en español, tanto en la app como en Supabase.
- [x] Cuentas existentes con contraseña antigua siguen pudiendo entrar.
- [x] Rate limit "sign-ups and sign-ins" = 10 / 5 min por IP; superarlo muestra "Demasiados intentos…".
- [x] El rate limit cuenta la IP del jugador (`sb-forwarded-for`), no la del servidor.
- [x] `SUPABASE_SECRET_KEY` no aparece en el bundle cliente.
- [x] Todas las rutas responden con `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.
- [x] Sin sesión, `/perfil` responde con redirección a `/login` desde el proxy; con sesión carga normal.
- [x] Las demás rutas (`/`, `/juegos/**`, `/salon-de-la-fama`, `/about`, `/login`) siguen públicas y el invitado puede jugar y guardar.
- [x] `tsc`, `lint` y `build` limpios; checklist, `CLAUDE.md` y `README.md` actualizados.

---

## Decisiones

- **Sí:** revocar EXECUTE de `rls_auto_enable()`. Razón: el event trigger no necesita el grant del llamante; cambio mínimo.
- **No:** mover la función a otro schema o borrarla. Razón: más cambios o se pierde el auto-RLS.
- **Sí:** check `user_id is null or user_id = auth.uid()` en el insert de `scores`. Razón: cierra el riesgo abierto de SPEC 16 aprovechando la migración.
- **Sí:** complejidad máxima (minúsc + mayúsc + dígito + símbolo) en Supabase y en la app. Razón: decisión del usuario; la app replica la regla para dar el error antes y en español.
- **Sí:** set de símbolos de la app igual al de Supabase. Razón: evitar que la app acepte algo que Supabase rechaza.
- **No:** leaked password protection. Razón: requiere plan Pro; el proyecto es Free.
- **Sí:** reenvío de IP con `Sb-Forwarded-For` + clave secreta. Razón: sin él, el límite por IP es global para todos los jugadores.
- **Sí:** clave secreta solo en un cliente dedicado a `auth.*` en Server Actions. Razón: la clave salta RLS; no debe usarse para datos.
- **No:** rate limit propio en memoria. Razón: no escala ni sobrevive a reinicios; Supabase ya lo hace con la IP real.
- **Sí:** solo los 3 headers del checklist. Razón: sin riesgo de romper Supabase, OAuth ni avatares; CSP en spec propia.

- **Sí:** proteger solo `/perfil` en el proxy mediante lista `PROTECTED_ROUTES`. Razón: es la única ruta que exige sesión y el invitado es flujo principal (SPEC 16); ampliar la lista es una línea. Supuesto: el usuario no concretó rutas.
- **No:** proteger `/juegos/[id]/jugar` ni todo el sitio. Razón: eliminaría el modo invitado.
- **No:** `?next=` ni redirigir `/login` → `/` con sesión desde el proxy. Razón: fuera de lo pedido; `/login` ya redirige en cliente.
- **Sí:** mantener la redirección en cliente de `/perfil` como respaldo. Razón: defensa en capas, coste cero.

---

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Clave secreta en cliente con cookies: alguna consulta de datos salta RLS   | `createAuthActionClient` solo se usa para `auth.*`; comentario en el código; revisión en paso 4 |
| `x-forwarded-for` falsificable si la app no está detrás de un proxy fiable | Aceptado en local; en despliegue tomar la IP que fije el proxy (Vercel la sobrescribe)          |
| "IP Address Forwarding" no activado → Supabase ignora la cabecera          | Paso 2 lo activa; verificación en logs de Auth del paso 4                                       |
| Rate limit 10/5 min bloquea pruebas manuales                               | Bucket de hasta 30 ráfagas; esperar 5 min o subir el valor temporalmente                        |
| Revocar EXECUTE rompe el event trigger `ensure_rls`                        | Verificación del paso 1 con tabla de prueba en transacción                                      |
| Nueva policy rompe el guardado de puntuaciones de invitados                | `user_id is null` permitido; verificación del paso 1 y partida real                             |
| `X-Frame-Options: DENY` impide embeber la app en iframes                   | Aceptado: la app no se embebe                                                                   |
| Next 16 cambia la API de `headers`                                         | Leer `node_modules/next/dist/docs/` antes del paso 5                                            |
| La redirección pierde las cookies de sesión refrescadas                    | Copiar las cookies de la respuesta del refresco a la redirección; verificación del paso 6       |
| El proxy no es frontera de seguridad de datos (solo UX/ruta)               | Los datos siguen protegidos por RLS (paso 1); el proxy no sustituye a RLS                       |

---

## Qué **no** entra en esta spec

- CSP, HSTS, Permissions-Policy.
- Leaked password protection (plan Pro).
- Rate limit propio o CAPTCHA.
- Forzar cambio de contraseñas débiles existentes.
- Medidor de fuerza de contraseña.

Cada uno, si llega, va en su propia spec.
