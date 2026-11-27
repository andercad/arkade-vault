# Auditorías de seguridad — Estado

> Mantenido por el agente `security-auditor`. Solo lectura sobre BD y código. Referencias: `specs/16-autenticacion.md`, `specs/17-medidas-seguridad.md`, `references/security/security-checklist.md`.

## Estado por check

| Área  | Check                                                      | Estado | Evidencia                                                                                                          | Última revisión |
| ----- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | --------------- |
| BD    | Advisors security                                          | 🟡     | Solo `auth_leaked_password_protection` (aceptado, Free)                                                            | 2026-11-25      |
| BD    | Advisors performance                                       | ✅     | Solo INFO `unused_index` `scores_user_idx`; sin `auth_rls_initplan`                                                | 2026-11-25      |
| BD    | RLS en tablas; `game_stats` security_invoker               | ✅     | games/profiles/scores `relrowsecurity=true`; vista `reloptions=security_invoker=true`                              | 2026-11-25      |
| BD    | Policies sin `true` en write; insert scores; profiles upd  | ✅     | única insert scores = `scores insert usuario` (`authenticated`, `user_id=(select auth.uid())`, sin `is null`); `profiles update propio` con `(select auth.uid())`; sin update/delete en scores/games | 2026-11-25 |
| BD    | `scores.user_id` not null + FK cascade (SPEC 18)           | ✅     | `attnotnull=true`; FK `auth.users(id) ON DELETE CASCADE`                                                           | 2026-11-25      |
| BD    | SECURITY DEFINER: search_path y EXECUTE                    | ✅     | 3 funciones con search_path fijado; `email_for_username`/`handle_new_user`/`rls_auto_enable`: public/anon/authenticated=false, service_role=true | 2026-11-25 |
| BD    | Event trigger `ensure_rls`                                 | ✅     | presente, `evtenabled=O`                                                                                           | 2026-11-25      |
| BD    | Pruebas rollback                                           | ✅     | anon insert → 42501 RLS; authenticated con `user_id` ajeno → 42501 RLS; propio → OK; `email_for_username` como anon → permission denied | 2026-11-25 |
| BD    | Deriva migraciones                                         | ✅     | 13 en BD ↔ `0001..0013` en archivos (mismos nombres; la 0013 se registró con prefijo `0013_` en el nombre, cosmético) | 2026-11-25 |
| BD    | Logs Auth (429/IP)                                         | ✅     | Sin 429 en 20 h; IPs de cliente o `::1` (local), no la del servidor; 400 puntuales (≤12/h, pruebas)                | 2026-11-25      |
| App   | `.env*` fuera de git; sin secretos `NEXT_PUBLIC_`          | ✅     | `git ls-files` sin `.env*`; grep sin `NEXT_PUBLIC_` con secret/service                                             | 2026-11-25      |
| App   | Secreto fuera de cliente/bundle                            | ✅     | sin `SUPABASE_SECRET_KEY`/`sb_secret_<valor>` en `.next/static`; ningún "use client" lo referencia                  | 2026-11-25      |
| App   | `server-only` y uso de admin/authAction                    | ✅     | `lib/supabase/admin.ts:1`, `server.ts:1`; usos solo en `app/login/actions.ts` y `app/perfil/actions.ts` (auth.*, `email_for_username`, `deleteUser`) | 2026-11-25 |
| App   | SPEC 20: IP, origen, PKCE, check:secret-client             | ✅     | `server.ts:46-55` (x-vercel-forwarded-for → x-real-ip → última de XFF); `login/actions.ts:23-28` `NEXT_PUBLIC_SITE_URL`; `callback/route.ts:23-26` por `error.code`/`name`; `npm run check:secret-client` OK | 2026-11-25 |
| App   | SPEC 19: changePassword / deleteAccount                    | ✅     | `perfil/actions.ts`: exige actual + `signInWithPassword` antes de `updateUser`, `signOut({scope:"others"})` (l.129); `deleteAccount` id de `getUser()` (l.24), compara username con `profiles`, único `deleteUser` (l.43); sin sesión → error | 2026-11-25 |
| App   | Headers en `next.config.ts`                                | ✅     | 3 headers, `source: "/:path*"` (`next.config.ts:18`), sin cambios pendientes en git                                 | 2026-11-25      |
| App   | Headers en respuesta del dev server                        | ✅     | `curl -I` de `/`, `/juegos/asteroids/jugar` y `/perfil` con los 3 headers                                          | 2026-11-25      |
| App   | `proxy.ts` protegido                                       | ✅     | `PROTECTED_ROUTES=["/perfil"]`, getClaims + copia cookies; `curl -I /perfil` → 307 `/login`                         | 2026-11-25      |
| App   | `auth-validation.ts`                                       | ✅     | ≥8 + min/mayús/dígito/símbolo (`lib/auth-validation.ts:17-28`); usada en registro, `perfil/actions.ts` y `reset-password-form.tsx` | 2026-11-25 |
| App   | Callback sin open redirect; sin dangerouslySetInnerHTML; sin console.log | ✅ | redirects a `${origin}/…` fijos; sin coincidencias de `dangerouslySetInnerHTML` ni `console.log`; `console.error` sin tokens/emails | 2026-11-25 |
| App   | `npm audit --omit=dev`                                     | ✅     | 0 vulnerabilidades                                                                                                 | 2026-11-25      |
| App   | Enumeración en `signUp`                                    | 🟡     | Riesgo aceptado (SPEC 20); no se reporta                                                                           | 2026-11-25      |
| Panel | Confirm email, min 8 + requisitos, rate limit 10/5 min     | manual | No verificable por MCP                                                                                             | 2026-11-25      |
| Panel | IP Address Forwarding                                      | 🟡     | Logs muestran IP de cliente (no la del servidor); confirmar en panel                                               | 2026-11-25      |
| Panel | Redirect URLs, proveedores Google/GitHub                   | manual | No verificable por MCP                                                                                             | 2026-11-25      |
| App   | SPEC 26 BFF: CSRF (`csrf.ts`)                              | ✅     | curl: POST con Origin ajeno → 403, sin Origin → 403, sin JSON → 415; GET sin comprobación                            | 2026-11-26 16:41 |
| App   | SPEC 26 BFF: cookies (`supabase.ts:45-55`)                 | 🟡     | `httpOnly`, `sameSite=lax`, `path=/`, `Secure` solo con NODE_ENV=production (`server.ts:69`); Secure en prod no verificado | 2026-11-26 16:41 |
| App   | SPEC 26 BFF: clave secreta (authClient/adminClient)        | ✅     | solo `auth.*`, `rpc('email_for_username')` y `admin.deleteUser`; `check:secret-client` OK; sin claves en `angular/dist/**/browser`; `.env` fuera de git, `.env.example` sin valores | 2026-11-26 16:41 |
| App   | SPEC 26 BFF: sesión/`/perfil`                              | ✅     | `curl -I /perfil` sin cookie → 302 `/login`; `/api/auth/me` → `{"user":null}`; `/api/scores` sin sesión → 401       | 2026-11-26 16:41 |
| App   | SPEC 26 BFF: redirecciones/open redirect                   | ✅     | `auth-navigation.ts`: destinos fijos; `redirectTo`/`emailRedirectTo` con `SITE_URL`; `/auth/oauth/xx` y `/auth/callback` sin code → `/login?error=oauth` | 2026-11-26 16:41 |
| App   | SPEC 26 BFF: scores/profile (id de sesión)                 | ✅     | `scores-api.ts` `player_name` de `profiles`, clamp 1e6; `profile-api.ts` id de `getUser()`, único `deleteUser` l.161 | 2026-11-26 16:41 |
| App   | SPEC 26 BFF: contacto (inyección)                          | ✅     | asunto sin CR/LF; email sin `\s` (`lib/contact.ts:13`); texto plano; honeypot; límites 60/120/2000                   | 2026-11-26 16:41 |
| App   | SPEC 26 BFF: manejo de errores JSON mal formado            | ✅     | `POST /api/contact` con `{bad` → 400 JSON `{"error":"Solicitud no válida."}` sin traza; `apiErrorHandler` (`json-errors.ts`) montado en `server.ts:137` | 2026-11-26 |
| App   | SPEC 26: IP en logs Auth                                   | 🟡     | no verificable con las claves de log disponibles (campos vacíos); ver hallazgo clientIp                              | 2026-11-26 16:41 |
| BD    | SPEC 26 frente a BD (advisors, RLS, policies, funciones)   | ✅     | advisors solo `auth_leaked_password_protection` (aceptado) + INFO `unused_index`; RLS 3/3; `game_stats` invoker; insert scores = `scores insert usuario`; funciones DEFINER con search_path y solo `service_role`; `ensure_rls` activo; sin deriva (13 migraciones) | 2026-11-26 16:41 |
| App   | `npm audit --omit=dev` (angular/)                          | ✅     | 0 vulnerabilidades                                                                                                  | 2026-11-26 16:41 |
| Panel | Redirect URLs `:4200` (callback, reset-password)           | manual | Confirmar en panel (SPEC 26)                                                                                        | 2026-11-26 16:41 |
| BD    | 0014: `sync_scores_player_name()` DEFINER + EXECUTE         | ✅     | `prosecdef=true`, `search_path=""`, owner postgres, public/anon/authenticated=false, service_role=true; SQL con nombres `public.` calificados | 2026-11-26 17:16 |
| BD    | 0014: trigger `on_profile_username_changed`                | ✅     | `AFTER UPDATE OF username`, `WHEN old IS DISTINCT FROM new`, `tgenabled=O`; solo toca `scores` del `new.id`          | 2026-11-26 17:16 |
| BD    | 0014: pruebas rollback (abuso vía RPC/RLS)                 | ✅     | rpc como authenticated y anon → 42501; update directo de `scores` propio → 0 filas; update de username propio → 1 fila y 2/2 scores sincronizados, 0 ajenos tocados; update de profile ajeno no probado (solo 1 perfil con datos) | 2026-11-26 17:16 |
| BD    | 0014: backfill / coherencia                                | ✅     | 0 desajustes `scores.player_name` vs `profiles.username` (2 scores)                                                  | 2026-11-26 17:16 |
| BD    | Advisors, RLS, policies, SPEC 18, `ensure_rls` (tras 0014) | ✅     | advisors solo `auth_leaked_password_protection` (aceptado) + INFO `unused_index`; RLS 3/3, `game_stats` invoker; policies sin cambios (insert `scores insert usuario`, sin update/delete en scores/games); `user_id` not null + FK cascade; 4 funciones DEFINER con search_path y solo service_role | 2026-11-26 17:16 |
| BD    | Deriva migraciones (14)                                    | ✅     | 14 en BD ↔ `0001..0014`; 0014 registrada como `sync_player_name` (sin prefijo, cosmético)                           | 2026-11-26 17:16 |
| App   | Headers y `/perfil` (Next :3000 y Angular :4200)           | ✅     | `curl -I` `/`, `/juegos/asteroids/jugar`: 3 headers; `/perfil` 307/302 → `/login`; `npm audit` 0; `check:secret-client` OK | 2026-11-26 17:16 |
| App   | Staging Angular (SPEC 27): 3 headers + `X-Robots-Tag: noindex, nofollow` | ✅ | `curl -I` en `/`, `/api/games`, `/games/snake/fruits.png`, `/perfil`, 404: los 4 presentes, sin duplicados (`vercel.json:10-19` + `server.ts:44-49`) | 2026-11-27 14:11 |
| App   | Staging: sin `x-powered-by`                                | ✅     | ausente en `/` y `/api/games`; `server: Vercel`                                                                     | 2026-11-27 14:11 |
| App   | Staging: `/perfil` sin cookie, 404                         | ✅     | `/perfil` → 302 `Location: /login`; `/ruta-inexistente` → 404; `/api/nada` → 404 JSON `{"error":"not_found"}`       | 2026-11-27 14:11 |
| App   | Staging: CSRF en `/api/*`                                  | ✅     | POST sin Origin → 403; Origin ajeno → 403; Origin propio + `text/plain` → 415; `/api/scores` sin sesión → 401; `/api/auth/me` → `{"user":null}` con `Cache-Control: private, no-store` | 2026-11-27 14:11 |
| App   | Staging: secretos en JS servido                            | ✅     | 24 ficheros (`main` + chunks, 564 KB) y HTML sin `SUPABASE_SECRET_KEY`/`RESEND_API_KEY`/`sb_secret`/`service_role`  | 2026-11-27 14:11 |
| App   | Staging: cookies de sesión `Secure`                        | 🟡     | código: `secure: env.secureCookies` = `NODE_ENV==='production'` (`server.ts:51,70`); `Set-Cookie` real no verificado (requiere login, no se crean sesiones) | 2026-11-27 14:11 |
| App   | `check:secret-client`, `npm audit --omit=dev` (angular/), `.env*` en git | ✅ | check OK (incl. `angular/src/server`); audit 0 vulnerabilidades; solo `.env.template` y `angular/.env.example` versionados | 2026-11-27 14:11 |
| App   | Next (:3000): headers, `/perfil` 307, `proxy.ts` en vivo   | n/a    | no verificado: dev server Next apagado (por petición)                                                               | 2026-11-27 14:11 |
| BD    | Tras SPEC 27: advisors, RLS, policies, funciones, rollback, deriva | ✅ | advisors solo `auth_leaked_password_protection` (aceptado) + INFO `unused_index`; RLS 3/3, `game_stats` invoker; policies sin `true` en write, insert = `scores insert usuario`; 4 DEFINER con search_path y solo `service_role`; `ensure_rls`=O; `user_id` not null + FK cascade; anon insert → 42501, `email_for_username` anon → 42501 (authenticated con id ajeno no repetido: policies sin cambios); 14 migraciones ↔ 14 archivos | 2026-11-27 14:11 |
| BD    | Logs Auth (429/IP)                                         | 🟡     | `auth_logs` sin campos de estado/IP legibles (129 eventos en 24 h); no concluyente                                  | 2026-11-27 14:11 |
| Panel | Redirect URLs de staging (`/auth/callback`, `/auth/reset-password`), `SITE_URL` en Vercel, rate limit, IP forwarding, Confirm email, Google/GitHub | manual | confirmar en panel Supabase y en variables de Vercel | 2026-11-27 14:11 |

Leyenda: `✅` correcto · `❌` hallazgo · `🟡` aceptado/parcial · `manual` confirmar en panel · `n/a` no aplica

## Historial de auditorías

| Fecha y hora | Resumen | Abiertos |
| ------------ | ------- | -------- |
| 2026-11-20 (sin hora) | Primera auditoría. BD limpia; app limpia salvo headers ausentes en dev server activo (a reiniciar)                      | 1 Medio (headers no servidos, por verificar) |
| 2026-11-20 (sin hora) | Re-auditoría: BD limpia; headers ya servidos tras el cambio a `/:path*`                                                 | 0 (cambio de `next.config.ts` sin commitear) |
| 2026-11-25 (sin hora) | Auditoría completa SPEC 16-20 (rama spec-20): BD y app limpias, pruebas rollback OK, dev server activo, `next.config.ts` ya commiteado | 0 (3 checks de panel `manual`)               |
| 2026-11-26 16:41 | Auditoría rama spec-26 (BFF Express Angular): BD limpia; CSRF, sesión, redirects, clave secreta y contacto OK; 2 hallazgos Bajo | 2 Bajo (errores sin handler JSON; clientIp fiable solo tras proxy) |
| 2026-11-26 17:16 | Auditoría migración 0014 (sync player_name): función DEFINER con search_path y sin EXECUTE, trigger acotado, sin abuso vía RPC/RLS, sin regresiones SPEC 16/17/18; 0 hallazgos nuevos | 2 Bajo previos (sin cambios) |
| 2026-11-26 (re-verificación) | Cerrado hallazgo JSON mal formado: `apiErrorHandler` ya montado; `curl` con `{bad` → 400 JSON sin traza. `clientIp` sigue abierto (corrección en SPEC 27) | 1 Bajo (`clientIp`, SPEC 27) |
| 2026-11-27 14:11 | SPEC 27 paso 4, staging Angular en Vercel (URL pública): headers + noindex sin duplicados, sin x-powered-by, `/perfil` 302, CSRF 403/415, sin secretos en el JS servido, `check:secret-client` y audit OK; BD sin cambios ni regresiones; Next no verificado | 1 Bajo previo (`clientIp`, sin cambios) |

## Hallazgos abiertos

- **Bajo — `clientIp` confía en `x-vercel-forwarded-for`/`x-real-ip`** (`angular/src/server/supabase.ts:23-35`). Solo es fiable tras Vercel; si el Express se expone directo, un cliente falsea `sb-forwarded-for` y esquiva el límite 10/5 min. Corrección: en SPEC 27 documentar/forzar el despliegue tras proxy, o leer solo esas cabeceras si `process.env.VERCEL` existe. Sin aplicar.
- Aceptado/futuro (no hallazgo): sin límite de envíos en `/api/contact` (SPEC 26 Decisiones); enumeración en `signUp` (SPEC 20).

Anterior: (ninguno) — Checks de panel siguen `manual`. Mejoras futuras fuera de alcance (si no están en spec): CSP, HSTS, Permissions-Policy, límite propio de intentos con contraseña errónea (ya aceptado en SPEC 19).
