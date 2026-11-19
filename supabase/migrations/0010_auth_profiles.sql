-- SPEC 16: perfiles de jugador, alta automática y scores.user_id
create extension if not exists unaccent with schema extensions;

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
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  raw text;
  base text;
  candidate text;
  n int := 1;
begin
  raw := coalesce(
    nullif(meta->>'username', ''),
    nullif(meta->>'user_name', ''),
    nullif(meta->>'preferred_username', ''),
    nullif(meta->>'full_name', ''),
    nullif(meta->>'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  base := left(regexp_replace(upper(extensions.unaccent(coalesce(raw, ''))), '[^A-Z0-9_]', '', 'g'), 10);
  if length(base) < 3 then
    base := 'PLAYER';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := left(base, 10 - length(n::text)) || n::text;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

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
