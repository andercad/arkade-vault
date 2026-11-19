# SPEC 16 — Registro, login y autenticación con Supabase Auth

> **Estado:** Implementado
> **Depende de:** SPEC 04 (Supabase cimientos), SPEC 06 (leaderboard y juegos)
> **Fecha:** 2026-11-19
> **Objetivo:** Sustituir la sesión simulada en `localStorage` por Supabase Auth real (email/usuario + contraseña, Google, GitHub, recuperación de contraseña) con perfil de jugador (avatar y username editable) y puntuaciones vinculadas al usuario.

> **Ampliación (2026-11-19):** pasos 10-12 añadidos tras pruebas (avatar en el nav, cambio de username en `/perfil`, comportamiento al borrar un usuario). Los pasos 1-9 ya están implementados.

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
- `components/nav.tsx` y `hall-of-fame.tsx`: siguen usando `useAuth()` (`user.name` = username). El nav con sesión muestra **un solo bloque avatar + nombre** (`components/account-menu.tsx`) que, al pulsarlo, despliega un menú con "Perfil" y "Cerrar sesión" (se cierra con clic fuera, `Esc` o al elegir; las opciones no se ven siempre). Hasta 1240px se oculta el nombre y en móvil se ve solo el avatar.
- **Avatar (paso 10):** componente `components/avatar.tsx` (círculo). Con foto (`user_metadata.avatar_url` o `picture`, que rellenan Google y GitHub) muestra la foto; sin foto —registro por email, o foto que no carga— muestra las **iniciales** (2 primeras letras del username) sobre un fondo oscuro tintado con un color neón de la paleta del navbar (cyan, magenta, violeta, verde, amarillo, naranja), elegido de forma estable a partir del username. Se ve en el nav (escritorio y panel móvil) y en `/perfil`, y enlaza a `/perfil`.
- **Cambiar username (paso 11):** nueva ruta `/perfil` con avatar, formulario de username (mismas reglas `^[A-Za-z0-9_]{3,10}$`, se guarda en mayúsculas, único) y botón "Cerrar sesión". Actualiza `profiles.username` con el cliente del navegador (RLS "update propio" ya existente). Nav, reproductor y Salón reflejan el nuevo nombre al instante vía `useAuth()`. Sin sesión, `/perfil` redirige a `/login`. Las puntuaciones antiguas conservan su `player_name`; siguen ligadas al usuario por `user_id`.
- **Borrar usuario (paso 12):** al borrarse un usuario (`auth.users`, p. ej. desde el panel de Supabase) sus puntuaciones se conservan y `scores.user_id` pasa a `null` (`on delete set null`, ya definido en `0010`); `profiles` se borra en cascada. Sin cambios de esquema: se verifica con una prueba en transacción.
- `CLAUDE.md` + `README.md` (rutas, env, SPEC 16; `/perfil` y avatar al ampliarse).

**Fuera:**

- Cambiar email o contraseña desde `/perfil`, subir una foto propia, borrar la cuenta desde la UI (el borrado se hace desde Supabase).
- Cooldown o límite de cambios de username; liberar o reservar nombres antiguos.
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
  name: string; // = profiles.username
  avatarUrl: string | null; // user_metadata.avatar_url ?? picture; null → iniciales
}
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Paso 11: valida, actualiza profiles y refresca user.name.
  updateUsername: (name: string) => Promise<AuthResult>;
}
```

```ts
// components/avatar.tsx
// <Avatar name avatarUrl size /> — foto circular (<img referrerPolicy="no-referrer">,
// onError → iniciales) o iniciales sobre fondo neón tintado estable por username.
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
   - `app/auth/callback/route.ts` (`exchangeCodeForSession` → `/`; fallo → `/login?error=oauth` con mensaje de error; si el canje falla por falta de verificador PKCE (enlace abierto en otro navegador, cuenta ya confirmada) → `/login?confirmed=1` con aviso positivo "Email confirmado. Ya puedes iniciar sesión"); botones con `signInWithOAuth`.
   - Verificación: enlace de confirmación del paso 5 → `/` con sesión; login real con GitHub y Google (manual, Playwright no puede autenticarse en terceros) → nav muestra username saneado; fila en `profiles`; abrir `/auth/callback` sin código → `/login?error=oauth`.
7. **Recuperar contraseña.**
   - Enlace en pestaña login → email → `resetPasswordForEmail(redirectTo /auth/reset-password)`; `app/auth/reset-password/page.tsx` lee `code` de la URL, canjea sesión, form nueva contraseña (`updateUser`), éxito → `/`; código inválido/caducado → mensaje + enlace a `/login`.
   - Verificación: email recibido con cuenta de prueba; nueva contraseña permite login y la vieja no; abrir `/auth/reset-password` sin código → mensaje de error.
8. **Reproductor: nombre + `user_id`.**
   - `game-player.tsx`: logueado → nombre inicial = `user.name`, editable; `submitScore` sin cambios (BD pone `user_id`).
   - Verificación: partida logueado → `select player_name, user_id from scores order by created_at desc limit 1` tiene `user_id` del usuario; nombre cambiado a mano se guarda tal cual; invitado → `user_id` null.
9. **Docs.**
   - `CLAUDE.md` (rutas `/auth/*`, `proxy.ts`, env `SUPABASE_SECRET_KEY`, SPEC 16) + `README.md`. (El Estado → Implementado pasa al paso 12.)
   - Verificación: `npm run build` OK; ambos archivos mencionan SPEC 16.
10. **Avatar en el nav.**
    - `lib/auth.tsx`: `User.avatarUrl` desde `user_metadata`; `components/avatar.tsx` (foto o iniciales, color estable por username, paleta neón del navbar); `nav.tsx` + `components/account-menu.tsx`: bloque avatar + nombre (pegados, en cápsula) que abre un menú desplegable con "Perfil" (`/perfil`) y "Cerrar sesión"; en escritorio ancho se ve avatar + nombre + flecha, hasta 1240px solo avatar, y en móvil solo avatar (sin desbordar 390px). El panel del menú hamburguesa conserva avatar + nombre y "Cerrar sesión".
    - Verificación: tsc/lint limpios; con sesión sin foto → círculo con iniciales y color coherente con el navbar; con `avatarUrl` válida → foto circular; con URL rota → iniciales (`onError`); Playwright 390×844 sin desbordar la barra; sin sesión el nav no cambia.
11. **Cambiar username (`/perfil`).**
    - `app/perfil/page.tsx` (+ `components/profile-form.tsx`): avatar grande, formulario de username con `USERNAME_RE` de `lib/auth-validation.ts`, guardado con `updateUsername` (`profiles.update` en mayúsculas); error `23505` → "Ese usuario ya existe."; éxito → aviso "Usuario actualizado"; botones "SALIR" (sale sin guardar y vuelve a la página anterior, o a `/`; con cambios pendientes se rotula "SALIR SIN GUARDAR") y "CERRAR SESIÓN"; sin sesión → `/login`. `lib/auth.tsx` expone `updateUsername` y actualiza `user.name`.
    - Verificación: con cuenta de prueba cambiar `TEST_16` → `TEST_17`: nav y `/perfil` muestran el nuevo nombre sin recargar; recargar lo mantiene (`select username from profiles`); entrar con el nombre nuevo funciona y con el viejo no; nombre ya en uso o inválido → error en español; reproductor prerrellena con el nuevo username; puntuaciones previas conservan `player_name` y `user_id`; `/perfil` sin sesión → `/login`.
12. **Borrado de usuario y cierre.**
    - Migración correctiva `0011_profiles_policy_initplan.sql` (la policy `profiles update propio` pasa a `(select auth.uid())` para quitar el aviso `auth_rls_initplan` de `get_advisors`). Sin más código nuevo: comprobar que `on delete set null` de `scores.user_id` y la cascada de `profiles` funcionan; actualizar `CLAUDE.md` (`/perfil`, avatar, borrado) y `README.md`; Estado → Implementado cuando pasen todos los criterios.
    - Verificación: en transacción con rollback: crear usuario → insertar una puntuación como `authenticated` → `delete from auth.users` de ese usuario → la fila de `scores` sigue existiendo con `user_id` null y su `player_name` intacto, y su `profiles` desaparece; `npm run build` OK; `get_advisors` sin avisos nuevos.

Un commit por paso (`16-autenticacion: Paso N`).

---

## Criterios de aceptación

- [x] Registro con email + usuario + contraseña crea `auth.users` + `profiles`, envía email de confirmación y NO inicia sesión.
- [x] El enlace del email confirma la cuenta (`email_confirmed_at` no nulo), inicia sesión y lleva a `/`.
- [x] Login con cuenta sin confirmar muestra "Confirma tu email antes de entrar".
- [x] Login funciona con email y con usuario (case-insensitive) tras confirmar; errores visibles en español.
- [x] Login con Google y GitHub crea perfil con username saneado `^[A-Z0-9_]{3,10}$`, único (sufijo numérico si choca).
- [x] Recuperar contraseña: email → `/auth/reset-password` → nueva contraseña operativa; sin código válido muestra error.
- [x] La sesión sobrevive a recarga y se refresca vía `proxy.ts`; cerrar sesión la elimina.
- [x] `email_for_username` no es ejecutable por `anon`/`authenticated`; `SUPABASE_SECRET_KEY` no aparece en el bundle cliente.
- [x] Puntuación de usuario logueado guarda `player_name` tecleado (prerrellenado con username) y `user_id`; invitado guarda `user_id` null.
- [x] `av_user` ya no se usa; `tsc`, `lint`, `build` limpios; `get_advisors` sin avisos nuevos.
- [x] CLAUDE.md y README.md actualizados (incluye `/perfil`, avatar y borrado).
- [x] Con sesión, el nav muestra un avatar circular: la foto de la red social si existe; si no (o si no carga), las iniciales sobre un fondo que combina con el navbar.
- [x] Con sesión, avatar y nombre forman un único bloque; al pulsarlo se abre un menú con "Perfil" y "Cerrar sesión" (no se ven siempre) y se cierra con clic fuera o `Esc`. En móvil (390×844) la barra muestra solo el avatar y no desborda.
- [x] `/perfil` ofrece "Guardar usuario", "Salir" (sin guardar) y "Cerrar sesión".
- [x] `/perfil` permite cambiar el username (3-10 caracteres, `A-Z0-9_`, único, se guarda en mayúsculas); nav, reproductor y Salón lo reflejan sin recargar y persiste tras recargar.
- [x] Username repetido o inválido → error en español; el login por usuario usa el nombre nuevo y el viejo deja de valer.
- [x] Las puntuaciones antiguas de un usuario que cambia de nombre conservan `player_name` y `user_id`.
- [x] Al borrar un usuario, sus puntuaciones se conservan con `user_id` null y su `profiles` se elimina.

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
- **Sí:** `/perfil` con cambio de username (antes fuera de alcance). Razón: decisión del usuario tras las pruebas; la BD ya permitía el update propio y no hace falta migración.
- **Sí:** avatar con foto de la red social o, si no hay, iniciales sobre fondo neón estable por username. Razón: decisión del usuario; sin subida de archivos ni Storage ni cambios de BD (la foto sale de `user_metadata`).
- **Sí:** al borrar un usuario, sus puntuaciones se quedan con `user_id` null. Razón: decisión del usuario; el Salón de la Fama no pierde historial. Ya lo cubre `on delete set null`.
- **No:** borrar cuenta desde la UI. Razón: spec futura; por ahora el borrado se hace desde Supabase.
- **No:** foto propia ni cambio de email/contraseña en `/perfil`. Razón: fuera del pedido; la contraseña se recupera con el flujo del paso 7.
- **No:** rutas protegidas. Razón: invitado sigue siendo flujo principal.

---

## Riesgos

| Riesgo                                                                   | Mitigación                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Cliente malicioso envía `user_id` ajeno (sin RLS que lo valide)          | Aceptado; spec futura añade `with check (user_id is null or user_id = auth.uid())`      |
| Rate limit del SMTP de Supabase (pocos emails/h) en registro y reset     | Probar con pocas cuentas; SMTP propio fuera de alcance                                  |
| Confirmar en otro navegador/dispositivo: PKCE falla al canjear el código | La cuenta queda confirmada igualmente; `/login?confirmed=1` avisa y pide iniciar sesión |
| Cuentas sin confirmar ocupan un username en `profiles`                   | Aceptado; limpieza de no confirmadas en spec futura                                     |
| OAuth requiere apps en Google Cloud / GitHub y redirect URLs exactas     | Paso 1 manual con checklist; verificación manual en paso 6                              |
| `proxy.ts` / API de Next 16 distinta a lo conocido                       | Leer `node_modules/next/dist/docs/` antes del paso 3                                    |
| `cacheComponents` + sesión en cliente: parpadeo invitado→usuario         | `loading` en el contexto; nav no pinta acceso hasta resolver                            |
| crater-rally reservaba `0010_seed_crater_rally.sql` (SPEC 15)            | Al implementarlo, renumerar su seed a `0011`                                            |
| Fuga de `SUPABASE_SECRET_KEY`                                            | `import "server-only"` en `admin.ts`; grep del bundle en verificación                   |
| Trigger falla → alta en `auth.users` bloqueada                           | Probar en transacción en paso 2 antes de UI                                             |
| Foto de red social caduca, bloquea el hotlink o no carga                 | `referrerPolicy="no-referrer"` y `onError` → iniciales; nunca se rompe el nav           |
| `<img>` con URL externa (sin `next/image`, sin `remotePatterns`)         | `eslint-disable` justificado en `avatar.tsx`; el avatar es pequeño y no crítico         |
| Cambiar username deja el Salón sin resaltar sus puntuaciones antiguas    | Aceptado: `hall-of-fame` resalta por nombre; mejora futura por `user_id`                |
| Cambios de username sin límite (suplantar un nombre recién liberado)     | Aceptado; cooldown o reserva de nombres en spec futura                                  |
| Carrera: dos cambios al mismo username a la vez                          | El índice único `profiles_username_key` rechaza el segundo (`23505`) → error en español |
