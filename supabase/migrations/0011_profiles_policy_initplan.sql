-- SPEC 16: evita reevaluar auth.uid() por fila en la policy de update de profiles
-- (aviso auth_rls_initplan de get_advisors).
drop policy "profiles update propio" on public.profiles;
create policy "profiles update propio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
