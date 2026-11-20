-- SPEC 17: medidas de seguridad básicas
-- 1) rls_auto_enable() (SECURITY DEFINER) no debe ser ejecutable vía /rest/v1/rpc.
--    El event trigger ensure_rls la invoca con los privilegios del evento, no del llamante.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 2) Un cliente no puede insertar puntuaciones con el user_id de otro jugador.
drop policy "scores insert anónimo" on public.scores;
create policy "scores insert anónimo" on public.scores
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id)
    and (user_id is null or user_id = (select auth.uid()))
  );
