# Auditorías de seguridad — Estado

> Mantenido por el agente `security-auditor`. Solo lectura sobre BD y código. Referencias: `specs/16-autenticacion.md`, `specs/17-medidas-seguridad.md`, `references/security/security-checklist.md`.

## Estado por check

| Área  | Check                                                     | Estado | Evidencia                                                                                                | Última revisión |
| ----- | --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- | --------------- |
| BD    | Advisors security                                         | 🟡     | Solo `auth_leaked_password_protection` (aceptado, Free)                                                  | 2026-11-20      |
| BD    | Advisors performance                                      | ✅     | Solo INFO `unused_index` `scores_user_idx`; sin `auth_rls_initplan`                                      | 2026-11-20      |
| BD    | RLS en tablas; `game_stats` security_invoker              | ✅     | profiles/scores/games `relrowsecurity=true`; vista con `security_invoker=true`                           | 2026-11-20      |
| BD    | Policies sin `true` en write; insert scores; profiles upd | ✅     | insert scores: `user_id is null or user_id=(select auth.uid())`; sin update/delete en scores/games       | 2026-11-20      |
| BD    | SECURITY DEFINER: search_path y EXECUTE                   | ✅     | 3 funciones con search_path fijado; `email_for_username`/`rls_auto_enable` solo `service_role`           | 2026-11-20      |
| BD    | Event trigger `ensure_rls`                                | ✅     | presente, `enabled=O`                                                                                    | 2026-11-20      |
| BD    | Pruebas rollback anon                                     | ✅     | user_id ajeno → RLS violation; null → OK; `email_for_username` → permission denied                       | 2026-11-20      |
| BD    | Deriva migraciones                                        | ✅     | 12 migraciones en BD ↔ `0001..0012` en archivos (timestamps distintos, mismos nombres)                   | 2026-11-20      |
| BD    | Logs Auth (429/IP)                                        | ✅     | Pico 429 + 400 a las 13:03-13:04Z, IP `203.0.113.x` (reenvío activo, no la del servidor); prueba de SPEC | 2026-11-20      |
| App   | `.env*` fuera de git; sin secretos `NEXT_PUBLIC_`         | ✅     | `git ls-files` sin `.env*` reales (solo `.env.template`)                                                 | 2026-11-20      |
| App   | Secreto fuera de cliente/bundle                           | ✅     | `.next/static`: solo coincide `startsWith("sb_secret_")` de supabase-js (no clave); sin "use client"     | 2026-11-20      |
| App   | `server-only` y uso de admin/authAction                   | ✅     | `lib/supabase/admin.ts:1`, `server.ts:1`; uso solo en `app/login/actions.ts` (auth + rpc)                | 2026-11-20      |
| App   | Headers en `next.config.ts`                               | ✅     | 3 headers en `/(.*)` (`next.config.ts:4-18`)                                                             | 2026-11-20      |
| App   | Headers en respuesta del dev server                       | ✅     | `curl -I /` y `/perfil` (307) con los 3 headers; `next.config.ts` ahora `source: "/:path*"` (sin commit) | 2026-11-20      |
| App   | `proxy.ts` protegido                                      | ✅     | `PROTECTED_ROUTES=["/perfil"]`, copia cookies; `curl /perfil` → 307 `/login`                             | 2026-11-20      |
| App   | `auth-validation.ts`                                      | ✅     | ≥8 + min/mayús/dígito/símbolo (`lib/auth-validation.ts:17-28`)                                           | 2026-11-20      |
| App   | Callback sin open redirect; sin dangerouslySetInnerHTML   | ✅     | redirects a `${origin}/…` fijos; sin coincidencias en grep                                               | 2026-11-20      |
| App   | `npm audit --omit=dev`                                    | ✅     | 0 vulnerabilidades                                                                                       | 2026-11-20      |
| Panel | Confirm email, min 8 + requisitos, rate limit 10/5 min    | manual | No verificable por MCP                                                                                   | 2026-11-20      |
| Panel | IP Address Forwarding                                     | 🟡     | Logs muestran IP de cliente; confirmar en panel                                                          | 2026-11-20      |
| Panel | Redirect URLs, proveedores Google/GitHub                  | manual | No verificable por MCP                                                                                   | 2026-11-20      |

Leyenda: `✅` correcto · `❌` hallazgo · `🟡` aceptado/parcial · `manual` confirmar en panel · `n/a` no aplica

## Historial de auditorías

| Fecha      | Resumen                                                                                         | Abiertos                                  |
| ---------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-11-20 | Primera auditoría. BD limpia; app limpia salvo headers ausentes en dev server activo (a reiniciar) | 1 Medio (headers no servidos, por verificar) |
| 2026-11-20 | Re-auditoría: BD limpia (advisors, RLS, policies, funciones, ensure_rls); headers ya servidos tras el cambio a `/:path*` | 0 (cambio de `next.config.ts` sin commitear) |

## Hallazgos abiertos

(ninguno) — Nota Bajo: `next.config.ts` modificado sin commit (`/(.*)` → `/:path*`); commitearlo. Checks de panel siguen `manual`.
