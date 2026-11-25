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

Leyenda: `✅` correcto · `❌` hallazgo · `🟡` aceptado/parcial · `manual` confirmar en panel · `n/a` no aplica

## Historial de auditorías

| Fecha      | Resumen                                                                                                                 | Abiertos                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2026-11-20 | Primera auditoría. BD limpia; app limpia salvo headers ausentes en dev server activo (a reiniciar)                      | 1 Medio (headers no servidos, por verificar) |
| 2026-11-20 | Re-auditoría: BD limpia; headers ya servidos tras el cambio a `/:path*`                                                 | 0 (cambio de `next.config.ts` sin commitear) |
| 2026-11-25 | Auditoría completa SPEC 16-20 (rama spec-20): BD y app limpias, pruebas rollback OK, dev server activo, `next.config.ts` ya commiteado | 0 (3 checks de panel `manual`)               |

## Hallazgos abiertos

(ninguno) — Checks de panel siguen `manual`. Mejoras futuras fuera de alcance (si no están en spec): CSP, HSTS, Permissions-Policy, límite propio de intentos con contraseña errónea (ya aceptado en SPEC 19).
