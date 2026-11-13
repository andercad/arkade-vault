# SPEC 04 — Cimientos de Supabase (clientes, migraciones y tipos)

> **Estado:** Implementado
> **Depende de:** SPEC 03 (convención de variables de entorno y `.env.template`)
> **Fecha:** 2026-11-12
> **Objetivo:** Dejar Supabase conectado a la app Next.js (clientes browser y servidor, variables de entorno, migraciones versionadas y tipos generados) y verificar la conexión con una tabla y una ruta de prueba temporales, sin tocar auth ni datos de negocio.

---

## Por qué existe esta spec

La app hoy guarda sesión (`av_user`) y puntuaciones (`av_scores`) en `localStorage`, y el Salón/Leaderboard usan datos seeded. Migrar auth y puntuaciones es grande y toca varias áreas. Esta spec solo pone la base común (dependencias, clientes, entorno, flujo de migraciones y tipos) para que las specs de Auth y Puntuaciones partan de una conexión ya verificada. El proyecto Supabase vinculado en `.mcp.json` está vacío (0 tablas en `public`).

---

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` y claves vacías documentadas en `.env.template`.
- Clientes tipados:
  - `lib/supabase/client.ts`: cliente para Client Components (`createBrowserClient`).
  - `lib/supabase/server.ts`: cliente para Server Components, Server Actions y Route Handlers (`createServerClient` con `cookies()`).
- Flujo de migraciones SQL versionadas en `supabase/migrations/`, aplicadas con la herramienta MCP `apply_migration`.
- Tipos generados con la herramienta MCP `generate_typescript_types` en `lib/supabase/database.types.ts`, usados por ambos clientes.
- Verificación temporal de conexión:
  - Migración `0001` crea `public.health_check` (1 fila, RLS activo, lectura pública con la publishable key).
  - Ruta temporal `app/api/supabase-health/route.ts` lee esa fila con el cliente servidor y responde JSON.
  - Migración `0002` elimina `health_check`, y se borra la ruta, al terminar.
- Revisar los advisors de seguridad (`get_advisors`) tras aplicar migraciones.

**Fuera de alcance (specs futuras):**

- Supabase Auth: login, registro, invitado, OAuth; sustituir `lib/auth.tsx` y `av_user`.
- `proxy.ts` (antes middleware) para refrescar la sesión; se añade en la spec de Auth.
- Tabla de puntuaciones, RLS de negocio, sustituir `saveScore` y los datos seeded del Salón/Leaderboard.
- Realtime, Storage, Edge Functions.
- Supabase CLI y stack local (Docker); se trabaja contra el proyecto remoto vía MCP.
- Service role key y cualquier código con privilegios elevados.
- Tests automatizados.

---

## Modelo de datos

Sin modelo de datos de negocio. Estructuras introducidas:

```sql
-- supabase/migrations/0001_health_check.sql  (temporal)
create table public.health_check (
  id int primary key,
  ok boolean not null default true
);
alter table public.health_check enable row level security;
create policy "health_check lectura pública"
  on public.health_check for select to anon, authenticated using (true);
insert into public.health_check (id, ok) values (1, true);
```

```sql
-- supabase/migrations/0002_drop_health_check.sql
drop table public.health_check;
```

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;

// lib/supabase/database.types.ts  (generado, no editar a mano)
export type Database = {
  public: { Tables: {}; Views: {}; Functions: {}; Enums: {} };
};
```

Variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=              # URL del proyecto (get_project_url)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # clave publishable (get_publishable_keys); pública por diseño, protegida por RLS
```

Convenciones:

- Nombres de migración `NNNN_descripcion.sql` con el mismo SQL que se envía a `apply_migration`.
- Solo se usa la publishable key; nunca la service role key ni variables sin `NEXT_PUBLIC_` para Supabase.
- Toda tabla en `public` lleva RLS activado desde su migración.
- `database.types.ts` se regenera tras cada migración que cambie el esquema.

---

## Plan de implementación

1. Leer la guía de Next 16 en `node_modules/next/dist/docs/` (variables de entorno, `cookies()`, Route Handlers) y la documentación vigente de Supabase vía `search_docs` (`@supabase/ssr` con Next.js App Router). Instalar `@supabase/supabase-js` y `@supabase/ssr`. Verificación: `npx tsc --noEmit` pasa.
2. Obtener URL y publishable key con `get_project_url` y `get_publishable_keys`; escribirlas en `.env.local` y añadir las claves vacías con comentario a `.env.template`. Verificación: `.env.local` no aparece en `git status`; `.env.template` sí.
3. Crear `supabase/migrations/0001_health_check.sql` y aplicarla con `apply_migration`; ejecutar `get_advisors` (security). Verificación: `list_tables` muestra `health_check` con RLS activo y sin advisors críticos.
4. Generar tipos con `generate_typescript_types` y guardarlos en `lib/supabase/database.types.ts`. Verificación: `npx tsc --noEmit` pasa.
5. Crear `lib/supabase/client.ts` y `lib/supabase/server.ts` tipados con `Database`. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
6. Crear la ruta temporal `app/api/supabase-health/route.ts` que lee `health_check` con el cliente servidor y devuelve `{ ok: true }` o `{ ok: false }` con el estado HTTP adecuado, sin filtrar el detalle del error. Verificación: `GET /api/supabase-health` responde 200 `{ "ok": true }`.
7. Comprobar el caso de fallo: con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` inválida la ruta responde error genérico (5xx) sin detalle del error. Restaurar la clave. Verificación: tras restaurar, vuelve a responder 200.
8. Limpieza: borrar `app/api/supabase-health/route.ts`, crear y aplicar `0002_drop_health_check.sql`, regenerar `database.types.ts`, y ejecutar `get_advisors`. Verificación: `list_tables` devuelve `public` vacío; `npm run build` y `npm run lint` pasan; la clave publishable aparece solo en el bundle cliente por diseño y `.env.local` no está versionado.

Para el diseño visual aplicar `/frontend-design` solo si en el futuro se añade UI (esta spec no añade UI).

---

## Criterios de aceptación

- [x] `@supabase/supabase-js` y `@supabase/ssr` están en `package.json`.
- [x] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y no está versionado; `.env.template` los lista vacíos y sí está versionado.
- [x] `supabase/migrations/` contiene `0001_health_check.sql` y `0002_drop_health_check.sql`, y ambas figuran en `list_migrations`.
- [x] Antes de la limpieza, `GET /api/supabase-health` responde 200 con `{ "ok": true }`.
- [x] Con la publishable key inválida la ruta responde un error genérico (5xx) sin texto del error de Supabase.
- [x] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen, exportan `createClient` y están tipados con `Database`.
- [x] `lib/supabase/database.types.ts` coincide con el esquema final (sin tablas en `public`).
- [x] `get_advisors` (security) no reporta tablas sin RLS ni otros avisos críticos.
- [x] Tras la limpieza no existe `app/api/supabase-health/` y `public` no tiene tablas.
- [x] Ninguna service role key ni secreto de Supabase aparece en el repo ni en `.next/static`.
- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `lib/auth.tsx`, `lib/scores.ts` y las pantallas existentes no han cambiado.

---

## Decisiones

- **Sí:** cimientos únicamente. Auth y Puntuaciones son specs propias; juntas tocan más de tres áreas.
- **Sí:** `@supabase/ssr` con clientes separados browser/servidor, patrón oficial para App Router y cookies.
- **No:** `proxy.ts` ahora. Sin auth no hay sesión que refrescar; se añade en la spec de Auth y evita código muerto.
- **Sí:** migraciones SQL versionadas en `supabase/migrations/`, aplicadas por MCP. Reproducible y revisable en git.
- **No:** Supabase CLI / stack local. Requiere Docker y no se pidió; se trabaja contra el proyecto remoto.
- **Sí:** tipos generados en `lib/supabase/database.types.ts`. Seguridad de tipos para las specs siguientes.
- **Sí:** solo publishable key en `NEXT_PUBLIC_*`, protegida por RLS. Sin service role en cliente ni servidor.
- **Sí:** tabla y ruta `health_check` temporales para verificar el extremo a extremo (migración, RLS, tipos, cliente servidor).
- **Sí:** eliminar tabla y ruta al terminar (decisión del usuario), mediante migración `0002`. El esquema vuelve a quedar vacío; el valor que permanece es el flujo y los clientes.
- **No:** dejar un endpoint de health permanente. No se pidió y expone superficie sin necesidad.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Next 16 / `@supabase/ssr` cambian respecto al conocimiento previo            | Leer `node_modules/next/dist/docs/` y `search_docs` de Supabase antes del paso 1; verificar con la ruta de salud. |
| Cambios en el proyecto remoto vía MCP son difíciles de revertir              | Tabla temporal e inocua; migración `0002` de limpieza; revisar el SQL antes de `apply_migration`.                 |
| Tabla sin RLS expuesta por PostgREST                                         | RLS activado en `0001` y comprobación con `get_advisors`.                                                         |
| Clave equivocada o pegada en el archivo erróneo                              | Solo `NEXT_PUBLIC_..._PUBLISHABLE_KEY`; criterio de aceptación sin service role en repo ni bundle.                |
| `.env.local` o claves versionadas por error                                  | `.env*` ya ignorado en `.gitignore`; `.env.template` sin valores; comprobar `git status`.                          |
| Tipos desactualizados tras migrar                                            | Regenerar `database.types.ts` en los pasos 4 y 8.                                                                 |
| Proyecto Supabase vinculado (`project_ref` en `.mcp.json`) no es el esperado | Confirmar la URL con `get_project_url` en el paso 2 antes de escribir variables.                                  |

---

## Qué **no** está en esta spec

- Supabase Auth (login, registro, invitado, OAuth) ni sustitución de `av_user`.
- `proxy.ts` / refresco de sesión.
- Tabla de puntuaciones, ranking real o sustitución de datos seeded.
- Realtime, Storage, Edge Functions.
- Supabase CLI y entorno local.
- Service role key.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
