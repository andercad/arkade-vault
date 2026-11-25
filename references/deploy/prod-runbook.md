# Runbook: Supabase dev → prod (Netlify)

Claude **no** tiene acceso a prod. Todo lo haces tú en los paneles. Solo estructura + seeds (los usuarios y puntuaciones de prueba de dev no se migran).

Placeholders: `<PROD_REF>` (Project Settings → General → Reference ID), `<PROD_URL>` (URL pública de Netlify o dominio propio).

## 1. Base de datos (SQL Editor de prod)

1. Opcional, comprobar que prod está vacío: `select count(*) from information_schema.tables where table_schema = 'public';` → debe dar 0.
2. Copiar **todo** `references/deploy/prod-setup.sql`, pegarlo en SQL Editor y ejecutar. Una sola vez (si se repite, falla porque las tablas ya existen).
3. Ejecutar `references/deploy/verify-prod.sql` y comparar con la línea base de abajo.

El script equivale a las migraciones 0001-0012 consolidadas. No deja historial de migraciones en prod: los cambios futuros se aplican pegando el SQL nuevo en el SQL Editor.

### Migración 0013 (SPEC 18): solo con sesión se guarda puntuación

`prod-setup.sql` (0001-0012) **no** la incluye. Pegar a mano `supabase/migrations/0013_scores_solo_usuarios.sql` en el SQL Editor de prod **antes o junto al despliegue** de la UI de SPEC 18. **Borra de forma irreversible** las puntuaciones con `user_id is null`: si se quieren conservar, exportarlas antes (`select * from public.scores where user_id is null;`). Después, `verify-prod.sql` debe mostrar la policy `scores insert usuario` (y no `scores insert anónimo`).

## 2. Auth (panel prod → Authentication)

- **Providers → Email**: "Confirm email" ON; longitud mínima 8 y requisitos minúscula + mayúscula + dígito + símbolo.
- **Providers → Google / GitHub**: client id/secret; en Google Cloud y GitHub añadir el callback `https://<PROD_REF>.supabase.co/auth/v1/callback`.
- **URL Configuration**: Site URL `<PROD_URL>`; Redirect URLs `<PROD_URL>/auth/callback` y `<PROD_URL>/auth/reset-password`.
- **Rate Limits**: sign-ups y sign-ins 10 por 5 min.
- **IP Address Forwarding**: ON.
- **SMTP**: configurar uno propio (p. ej. Resend); el de Supabase por defecto casi no envía emails.

## 3. Netlify (Site configuration → Environment variables)

Solo contexto **Production**; en Deploy Previews usar las claves de dev.

| Variable                               | Valor                                                  |
| -------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<PROD_REF>.supabase.co`                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key de prod (Settings → API Keys)          |
| `SUPABASE_SECRET_KEY`                  | secret key de prod; marcar como secret                 |
| `NEXT_PUBLIC_SITE_URL`                 | origen público de prod, sin `/` final (SPEC 20), igual que las Redirect URLs de Supabase; obligatoria: sin ella el registro falla |
| `RESEND_API_KEY`                       | clave de Resend                                        |
| `CONTACT_TO_EMAIL`                     | como dev                                               |
| `CONTACT_FROM_EMAIL`                   | como dev (dominio verificado en Resend)                |

> SPEC 20: `NEXT_PUBLIC_SITE_URL` también debe definirse en **Vercel** (Settings → Environment Variables; despliegue actual, `vercel.json`) y en Preview si se prueba el registro ahí. La IP del jugador se lee de `x-vercel-forwarded-for`/`x-real-ip`/última entrada de `x-forwarded-for`; en otros hostings habría que revisar `clientIp()`.

Después, **redeploy** (las `NEXT_PUBLIC_*` se fijan en el build). Si el escáner de secretos de Netlify rompe el build por las `NEXT_PUBLIC_*`, añadir `SECRETS_SCAN_OMIT_KEYS=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## 4. Comprobar la app

- `/` y `/juegos` listan 5 juegos.
- Jugar como invitado: al terminar solo sale "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN"; con sesión, guardar y ver la puntuación en el ranking.
- Crear cuenta → llega el email de confirmación → login.
- Panel prod → Advisors: solo debe quedar "Leaked password protection" (requiere Pro).

## 5. Acceso de solo lectura para Claude (opcional, pooler)

Usuario propio `claude_reader` (contraseña distinta a la de `postgres`) miembro del grupo `prod_readonly`. Solo `SELECT` en `public`; sin acceso a `auth.*`. Ejecutar en el SQL Editor de prod como `postgres`. **No guardar la contraseña en el repo**: solo en env / `.claude/settings.local.json` (gitignored).

```sql
-- 1. Rol de grupo (solo permisos, sin login)
create role prod_readonly nologin;
grant usage on schema public to prod_readonly;
grant select on all tables in schema public to prod_readonly;
alter default privileges for role postgres in schema public
  grant select on tables to prod_readonly;

-- 2. Usuario de login con su propia contraseña
create role claude_reader with
  login inherit
  password 'CAMBIAR_POR_PASSWORD_LARGA_Y_UNICA'
  nosuperuser nocreatedb nocreaterole noreplication
  bypassrls
  connection limit 3;
grant prod_readonly to claude_reader;

-- 3. Config de solo lectura (en el usuario, no se hereda del grupo)
alter role claude_reader set default_transaction_read_only = on;
alter role claude_reader set statement_timeout = '15s';
alter role claude_reader set idle_in_transaction_session_timeout = '30s';
alter role claude_reader set search_path = public;

-- 4. Sin escritura
revoke create on schema public from prod_readonly, claude_reader;
```

Si `bypassrls` da error de permisos: quitarlo del `create role` y añadir (solo prod, sin migración en dev):

```sql
create policy "prod_readonly select" on public.games    for select to prod_readonly using (true);
create policy "prod_readonly select" on public.scores   for select to prod_readonly using (true);
create policy "prod_readonly select" on public.profiles for select to prod_readonly using (true);
```

Verificación:

```sql
select rolname, rolcanlogin, rolbypassrls, rolconfig from pg_roles
where rolname in ('prod_readonly','claude_reader');

-- PG16+: postgres es admin de claude_reader pero sin opción SET → "permission denied to set role".
grant claude_reader to postgres with set true;

set role claude_reader;
select count(*) from public.scores;          -- OK
insert into public.games(id) values ('x');   -- debe fallar
select count(*) from auth.users;             -- debe fallar (permission denied)
reset role;

-- limpiar tras probar
revoke set option for claude_reader from postgres;
```

Alternativa: probar con la cadena del pooler (abajo) y repetir los tres `select`/`insert`; valida además contraseña y pooler. Si `scores` devuelve 0 filas habiendo datos, falta `bypassrls` (usar las policies).

Conexión (Dashboard → Connect → Session pooler):

```text
postgresql://claude_reader.<PROJECT_REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- Usuario = `claude_reader.<PROJECT_REF>` (lo exige Supavisor). 5432 = session mode; 6543 = transaction mode.
- Rotar: `alter role claude_reader password 'nueva';` · Bloquear: `alter role claude_reader nologin;` · Borrar: `drop role claude_reader;`

## Línea base de dev (salida de `verify-prod.sql`)

```text
ext      pg_stat_statements, pgcrypto, plpgsql, supabase_vault, unaccent, uuid-ossp
func     email_for_username secdef=true anon=false auth=false service=true
func     handle_new_user    secdef=true anon=false auth=false service=true
func     rls_auto_enable    secdef=true anon=false auth=false service=true   (solo si existe en prod)
game     arkanoid ARCADE green | asteroids SHOOTER magenta | frogger ARCADE green
         snake ARCADE green | tetris PUZZLE cyan
policy   games    | games lectura pública    | SELECT
         profiles | profiles lectura pública | SELECT
         profiles | profiles update propio   | UPDATE
         scores   | scores insert usuario    | INSERT   (tras 0013, SPEC 18)
         scores   | scores lectura pública   | SELECT
table    game_stats rls=false kind=v   (vista security_invoker)
         games rls=true kind=r | profiles rls=true kind=r | scores rls=true kind=r
trigger  on_auth_user_created
```
