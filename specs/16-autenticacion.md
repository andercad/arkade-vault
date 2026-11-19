# SPEC 16 — Registro, login y autenticación con Supabase Auth

> **Estado:** Aprobado
> **Depende de:** SPEC 04 (Supabase cimientos), SPEC 06 (leaderboard y juegos)
> **Fecha:** 2026-11-19
> **Objetivo:** Sustituir la sesión simulada en `localStorage` por Supabase Auth real (email/usuario + contraseña, Google, GitHub, recuperación de contraseña) con perfil de jugador y puntuaciones vinculadas al usuario.

---

## Por qué existe esta spec

- `lib/auth.tsx` solo guarda `{ name }` en `localStorage` (`av_user`): cualquiera "entra" con cualquier nombre, sin contraseña.
- `components/auth-form.tsx` ignora contraseña y email; Google/GitHub son botones decorativos.
- `scores` no sabe qué usuario jugó: si alguien cambia de nombre, pierde sus puntuaciones.
- SPEC 04 dejó pendiente `proxy.ts` para refrescar la sesión (`lib/supabase/server.ts`).

## Alcance

**Dentro:**

- Migración `0010_auth_profiles.sql`: tabla `profiles`, trigger de alta con username saneado, `scores.user_id`, función `email_for_username` (solo `service_role`).
- Registro: email + usuario + contraseña **con confirmación de email**: "Confirm email" activado en Supabase; `signUp` envía el email de confirmación (SMTP de Supabase) y la UI muestra "Revisa tu correo". Sin sesión hasta confirmar.
- Confirmación: el enlace del email vuelve a `app/auth/callback/route.ts` (`emailRedirectTo`), que canjea el código, deja la sesión iniciada y redirige a `/`.
- Login: email **o** usuario + contraseña vía Server Action `app/login/actions.ts`; cuenta sin confirmar → error "Confirma tu email antes de entrar" (sin reenvío automático).
- OAuth Google y GitHub con la misma ruta `app/auth/callback/route.ts` (cuentas OAuth ya llegan confirmadas); username tomado del nombre de la red social (saneado + sufijo si choca).
- Recuperar contraseña: enlace "¿Olvidaste tu contraseña?" en `/login` → email → nueva ruta `/auth/reset-password` que lee el código de la URL y muestra el form de nueva contraseña.
- `proxy.ts` en la raíz: refresco de sesión con `@supabase/ssr` (leer `node_modules/next/dist/docs/` antes).
- `lib/supabase/admin.ts` (server-only, `SUPABASE_SECRET_KEY`) para resolver username → email.
- `lib/auth.tsx` reescrito sobre Supabase (`onAuthStateChange` + `profiles`); `User = { id, name }`; se borra `av_user` del `localStorage`.
- `components/auth-form.tsx`: estados cargando/error, validación de username, botones OAuth funcionales; "JUGAR COMO INVITADO" se mantiene (va a `/` sin sesión).
- `/login` redirige a `/` si ya hay sesión.
- `components/game-player.tsx`: logueado → nombre prerrellenado con `username`, editable; `user_id` lo pone la BD. Invitado igual que hoy.
- `components/nav.tsx` y `hall-of-fame.tsx`: siguen usando `useAuth()` (`user.name` = username).
- `CLAUDE.md` + `README.md` (rutas, env, SPEC 16).

**Fuera:**

- Cambiar username / página `/perfil` (BD permite update propio, sin UI).
- Rutas protegidas (todo sigue público; invitado juega y guarda como hoy).
- Reenviar email de confirmación desde la UI, magic link, 2FA, borrar cuenta.
- Plantillas de email personalizadas (se usan las de Supabase).
- Migrar `av_user` antiguo a cuentas reales.
- Validar en RLS que `scores.user_id = auth.uid()` (decisión: solo `default`).
- SMTP propio (se usa el de Supabase).
- Puntuaciones "mis records" / filtrar por `user_id` en UI.

---

## Modelo de datos

```sql
-- 0010_auth_profiles.sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (username);
alter table public.profiles enable row level security;
create policy "profiles lectura pública" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles update propio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Saneado: unaccent → upper → solo [A-Z0-9_] → left(10); <3 → 'PLAYER';
-- si existe: left(base, 10 - len(n)) || n, n = 2,3… hasta libre.
-- Fuente: raw_user_meta_data->>'username' (registro email) |
--         'user_name' / 'preferred_username' (GitHub) | 'full_name' / 'name' (Google) | split_part(email,'@',1).
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$ … $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Login por usuario (solo servidor con service_role)
create function public.email_for_username(p_username text) returns text
  language sql security definer set search_path = '' stable as $$
  select u.email from auth.users u join public.profiles p on p.id = u.id
  where p.username = upper(p_username) $$;
revoke execute on function public.email_for_username(text) from public, anon, authenticated;
grant execute on function public.email_for_username(text) to service_role;

alter table public.scores
  add column user_id uuid references auth.users(id) on delete set null default auth.uid();
create index scores_user_idx on public.scores (user_id);
```

(`unaccent` si no está activa: `create extension if not exists unaccent with schema extensions`.) Policy de insert de `scores` sin cambios.

```ts
// lib/auth.tsx
export interface User {
  id: string;
  name: string;
} // name = profiles.username
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

Env nueva: `SUPABASE_SECRET_KEY` (solo servidor; nunca `NEXT_PUBLIC_`).

---

## Plan de implementación

1. **Configuración Supabase (manual + MCP).**
   - Dejar **activado** "Confirm email"; habilitar proveedores Google y GitHub (client id/secret en consola); Site URL y Redirect URLs `http://localhost:3000/auth/callback` y `/auth/reset-password`; añadir `SUPABASE_SECRET_KEY` a `.env.local`.
   - Verificación: panel muestra "Confirm email" activo y proveedores activos; `.env.local` tiene la clave y `git status` no lo lista.
2. **Migración BD.**
   - `supabase/migrations/0010_auth_profiles.sql`; `apply_migration`; regenerar `lib/supabase/database.types.ts`.
   - Verificación: `list_migrations` incluye 0010; en transacción con rollback: insert en `auth.users` con `raw_user_meta_data` `{"full_name":"Ana María López"}` → profile `ANAMARIALO`; segundo igual → `ANAMARIAL2`; `select email_for_username('x')` como `anon` falla por permisos; `get_advisors` security sin avisos nuevos.
3. **Sesión en servidor: `proxy.ts` + `lib/supabase/admin.ts`.**
   - `proxy.ts` refresca cookies (patrón `@supabase/ssr`); quitar comentario pendiente de `server.ts`; `admin.ts` con `import "server-only"`.
   - Verificación: `npx tsc --noEmit` + `npm run lint` limpios; `npm run dev` sin errores; navegar `/` y `/juegos` igual que antes (Playwright).
4. **`lib/auth.tsx` sobre Supabase.**
   - Provider con `getUser` + `onAuthStateChange` + lectura de `profiles`; `signOut` real; borrar `av_user`; ajustar `nav.tsx`, `hall-of-fame.tsx` al nuevo tipo.
   - Verificación: tsc/lint limpios; sin sesión, nav muestra acceso y Salón funciona; `localStorage.av_user` desaparece tras cargar.
5. **Registro y login email/usuario.**
   - `app/login/actions.ts` (Server Actions `signUp` con `emailRedirectTo` = `/auth/callback`, `signIn`: si el identificador no tiene `@`, `email_for_username` vía admin); `auth-form.tsx` con validación `^[A-Za-z0-9_]{3,10}$`, errores en español (credenciales inválidas, usuario/email ya existe, email sin confirmar), estado cargando, vista "Revisa tu correo" tras registrarse (sin sesión); `/login` redirige a `/` con sesión.
   - Verificación (Playwright): crear cuenta `TEST_16` → vista "Revisa tu correo", nav sin sesión; `select email_confirmed_at from auth.users` es null y entrar antes de confirmar → "Confirma tu email"; confirmar con el enlace real del email (manual) → sesión y nav muestra `TEST_16`; cerrar sesión; entrar con email y luego con `test_16` → OK; contraseña mala → mensaje de error; volver a `/login` logueado → `/`.
6. **Callback OAuth y confirmación (Google y GitHub).**
   - `app/auth/callback/route.ts` (`exchangeCodeForSession` → `/`; error → `/login?error=oauth`, o `/login?error=confirm` si venía de confirmación de email, con mensaje "Si ya confirmaste tu email, inicia sesión"); botones con `signInWithOAuth`.
   - Verificación: enlace de confirmación del paso 5 → `/` con sesión; login real con GitHub y Google (manual, Playwright no puede autenticarse en terceros) → nav muestra username saneado; fila en `profiles`; abrir `/auth/callback` sin código → `/login?error=oauth`.
7. **Recuperar contraseña.**
   - Enlace en pestaña login → email → `resetPasswordForEmail(redirectTo /auth/reset-password)`; `app/auth/reset-password/page.tsx` lee `code` de la URL, canjea sesión, form nueva contraseña (`updateUser`), éxito → `/`; código inválido/caducado → mensaje + enlace a `/login`.
   - Verificación: email recibido con cuenta de prueba; nueva contraseña permite login y la vieja no; abrir `/auth/reset-password` sin código → mensaje de error.
8. **Reproductor: nombre + `user_id`.**
   - `game-player.tsx`: logueado → nombre inicial = `user.name`, editable; `submitScore` sin cambios (BD pone `user_id`).
   - Verificación: partida logueado → `select player_name, user_id from scores order by created_at desc limit 1` tiene `user_id` del usuario; nombre cambiado a mano se guarda tal cual; invitado → `user_id` null.
9. **Docs.**
   - `CLAUDE.md` (rutas `/auth/*`, `proxy.ts`, env `SUPABASE_SECRET_KEY`, SPEC 16) + `README.md`; Estado → Implementado.
   - Verificación: `npm run build` OK; ambos archivos mencionan SPEC 16.

Un commit por paso (`16-autenticacion: Paso N`).

---

## Criterios de aceptación

- [ ] Registro con email + usuario + contraseña crea `auth.users` + `profiles`, envía email de confirmación y NO inicia sesión.
- [ ] El enlace del email confirma la cuenta (`email_confirmed_at` no nulo), inicia sesión y lleva a `/`.
- [ ] Login con cuenta sin confirmar muestra "Confirma tu email antes de entrar".
- [ ] Login funciona con email y con usuario (case-insensitive) tras confirmar; errores visibles en español.
- [ ] Login con Google y GitHub crea perfil con username saneado `^[A-Z0-9_]{3,10}$`, único (sufijo numérico si choca).
- [ ] Recuperar contraseña: email → `/auth/reset-password` → nueva contraseña operativa; sin código válido muestra error.
- [ ] La sesión sobrevive a recarga y se refresca vía `proxy.ts`; cerrar sesión la elimina.
- [ ] `email_for_username` no es ejecutable por `anon`/`authenticated`; `SUPABASE_SECRET_KEY` no aparece en el bundle cliente.
- [ ] Puntuación de usuario logueado guarda `player_name` tecleado (prerrellenado con username) y `user_id`; invitado guarda `user_id` null.
- [ ] `av_user` ya no se usa; `tsc`, `lint`, `build` limpios; `get_advisors` sin avisos nuevos.
- [ ] CLAUDE.md y README.md actualizados.

---

## Decisiones

- **Sí:** una sola spec con email, OAuth y reset. Razón: decisión del usuario pese a tocar >3 áreas.
- **Sí:** tabla `profiles` con trigger. Razón: unicidad de username en BD; `user_metadata` no la garantiza.
- **Sí:** login por usuario con Server Action + `service_role`. Razón: el email nunca llega al cliente; RPC pública permitiría enumerar emails.
- **Sí:** username OAuth del nombre de la red social, saneado + sufijo. Razón: sin pantalla extra.
- **Sí:** `player_name` editable + `scores.user_id`. Razón: identifica al usuario aunque cambie el nombre.
- **Sí:** `user_id default auth.uid()` sin policy extra. Razón: decisión del usuario; el cliente normal no lo envía.
- **Sí:** confirmación de email obligatoria, canjeada en `/auth/callback` (sin ruta `/auth/confirm` ni plantilla propia). Razón: decisión del usuario; reutiliza la ruta OAuth y las plantillas por defecto.
- **No:** reenvío de confirmación desde la UI. Razón: spec futura; el usuario puede registrarse de nuevo tras caducar.
- **No:** `/perfil` ni renombrar. Razón: spec futura; BD ya lo permite.
- **No:** rutas protegidas. Razón: invitado sigue siendo flujo principal.

---

## Riesgos

| Riesgo                                                                   | Mitigación                                                                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Cliente malicioso envía `user_id` ajeno (sin RLS que lo valide)          | Aceptado; spec futura añade `with check (user_id is null or user_id = auth.uid())` |
| Rate limit del SMTP de Supabase (pocos emails/h) en registro y reset     | Probar con pocas cuentas; SMTP propio fuera de alcance                             |
| Confirmar en otro navegador/dispositivo: PKCE falla al canjear el código | La cuenta queda confirmada igualmente; `/login?error=confirm` pide iniciar sesión  |
| Cuentas sin confirmar ocupan un username en `profiles`                   | Aceptado; limpieza de no confirmadas en spec futura                                |
| OAuth requiere apps en Google Cloud / GitHub y redirect URLs exactas     | Paso 1 manual con checklist; verificación manual en paso 6                         |
| `proxy.ts` / API de Next 16 distinta a lo conocido                       | Leer `node_modules/next/dist/docs/` antes del paso 3                               |
| `cacheComponents` + sesión en cliente: parpadeo invitado→usuario         | `loading` en el contexto; nav no pinta acceso hasta resolver                       |
| crater-rally reservaba `0010_seed_crater_rally.sql` (SPEC 15)            | Al implementarlo, renumerar su seed a `0011`                                       |
| Fuga de `SUPABASE_SECRET_KEY`                                            | `import "server-only"` en `admin.ts`; grep del bundle en verificación              |
| Trigger falla → alta en `auth.users` bloqueada                           | Probar en transacción en paso 2 antes de UI                                        |
