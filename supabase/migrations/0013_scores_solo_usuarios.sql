-- 0013_scores_solo_usuarios.sql (SPEC 18)
-- Solo los jugadores con sesión guardan puntuación.

-- 1) Puntuaciones de invitado fuera (irreversible).
delete from public.scores where user_id is null;

-- 2) Toda puntuación pertenece a un usuario; si se borra, se borran sus puntuaciones.
alter table public.scores alter column user_id set not null;
alter table public.scores drop constraint scores_user_id_fkey;
alter table public.scores
  add constraint scores_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- 3) Insert solo con sesión y con el propio user_id.
drop policy "scores insert anónimo" on public.scores;
create policy "scores insert usuario" on public.scores
  for insert to authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id)
    and user_id = (select auth.uid())
  );
