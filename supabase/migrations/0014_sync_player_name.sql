-- 0014_sync_player_name.sql
-- Al cambiar profiles.username, las puntuaciones del usuario toman el nombre nuevo.

create function public.sync_scores_player_name() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  update public.scores set player_name = new.username where user_id = new.id;
  return new;
end $$;
revoke execute on function public.sync_scores_player_name() from public, anon, authenticated;

create trigger on_profile_username_changed
  after update of username on public.profiles
  for each row when (old.username is distinct from new.username)
  execute function public.sync_scores_player_name();

-- Reparación de lo ya almacenado: alinea puntuaciones antiguas con el username actual.
update public.scores s set player_name = p.username
  from public.profiles p
  where p.id = s.user_id and s.player_name is distinct from p.username;
