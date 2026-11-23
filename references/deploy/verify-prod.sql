-- Verificación de esquema (SOLO LECTURA). Ejecutar en el SQL Editor de PROD
-- y comparar fila a fila con la salida de DEV.
select k, v from (
  select 'table' k, c.relname || ' rls=' || c.relrowsecurity::text || ' kind=' || c.relkind::text v
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
  union all
  select 'policy', tablename || ' | ' || policyname || ' | ' || cmd
    from pg_policies where schemaname = 'public'
  union all
  select 'func', p.proname || ' secdef=' || p.prosecdef::text
      || ' anon=' || has_function_privilege('anon', p.oid, 'execute')::text
      || ' auth=' || has_function_privilege('authenticated', p.oid, 'execute')::text
      || ' service=' || has_function_privilege('service_role', p.oid, 'execute')::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  union all
  select 'trigger', tgname from pg_trigger
    where tgrelid = 'auth.users'::regclass and not tgisinternal
  union all
  select 'game', id || ' ' || cat || ' ' || color from public.games
  union all
  select 'ext', extname from pg_extension
) t order by k, v;
