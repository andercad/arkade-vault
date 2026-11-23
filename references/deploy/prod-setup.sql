-- Arcade Vault: esquema + seeds completos para PRODUCCIÓN.
-- Equivale a las migraciones 0001-0012 ya consolidadas (estado final de dev).
-- Uso: pegar entero en Supabase (PROD) → SQL Editor → Run. Una sola vez, en un proyecto vacío.

create extension if not exists unaccent with schema extensions;

-- ── Juegos ────────────────────────────────────────────────────────────────
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null,
  sort_order int not null unique,
  constraint games_cat_check check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS','RACING','FIGHTING','PLATFORMER','MAZE','RHYTHM','SPORTS','STRATEGY')),
  constraint games_color_check check (color in ('green','cyan','magenta','yellow','orange','violet','red','blue','lime','pink','silver')),
  constraint games_cat_color_check check ((cat, color) in (('ARCADE','green'),('PUZZLE','cyan'),('SHOOTER','magenta'),('VERSUS','yellow'),
    ('RACING','orange'),('PLATFORMER','violet'),('FIGHTING','red'),('MAZE','blue'),
    ('SPORTS','lime'),('RHYTHM','pink'),('STRATEGY','silver')))
);

-- ── Perfiles ──────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (username);

-- ── Puntuaciones ──────────────────────────────────────────────────────────
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score int not null check (score between 0 and 1000000),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null default auth.uid()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
create index scores_created_idx on public.scores (created_at desc);
create index scores_user_idx on public.scores (user_id);

create view public.game_stats with (security_invoker = true) as
select g.id as game_id,
       coalesce(max(s.score), 0)::int as best,
       count(s.id)::int as plays
from public.games g left join public.scores s on s.game_id = g.id
group by g.id;

-- ── RLS y policies ────────────────────────────────────────────────────────
alter table public.games enable row level security;
alter table public.scores enable row level security;
alter table public.profiles enable row level security;

create policy "games lectura pública" on public.games
  for select to anon, authenticated using (true);
create policy "scores lectura pública" on public.scores
  for select to anon, authenticated using (true);
create policy "scores insert anónimo" on public.scores
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id)
    and (user_id is null or user_id = (select auth.uid()))
  );
create policy "profiles lectura pública" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles update propio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── Alta automática de perfil al registrarse ──────────────────────────────
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

-- rls_auto_enable() la crea Supabase en algunos proyectos; solo se revoca si existe.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ── Seeds: los 5 juegos ───────────────────────────────────────────────────
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
('asteroids', 'ASTEROIDS', 'Sobrevive al campo de asteroides.',
 'Pilota tu nave en un espacio sin bordes. Rota, propulsa y dispara para partir asteroides en fragmentos cada vez más pequeños. Recoge el disparo triple y aguanta oleadas cada vez mayores.',
 'SHOOTER', 'cover-asteroids', 'magenta', 1),
('tetris', 'TETRIS', 'Encaja las piezas y limpia líneas.',
 'Apila piezas en un tablero de 10×20 y completa filas para borrarlas mientras la caída se acelera. Incluye la pieza tuerca, con un hueco central difícil de rellenar. Elige skin y nivel inicial.',
 'PUZZLE', 'cover-tetris', 'cyan', 2),
('arkanoid', 'ARKANOID', 'Rompe todos los bloques con la bola.',
 'Mueve la pala para que la bola no caiga y rompe los bloques de colores. Cinco niveles con patrones distintos y una bola más rápida en cada uno. Tienes tres vidas.',
 'ARCADE', 'cover-arkanoid', 'green', 3),
('snake', 'SNAKE', 'Come frutas y crece sin chocarte.',
 'Guía a la serpiente por el tablero, come frutas para crecer y evita las paredes y tu propio cuerpo. Cada cinco frutas subes de nivel y la serpiente se mueve más rápido.',
 'ARCADE', 'cover-snake', 'green', 4),
('frogger', 'FROGGER', 'Cruza la carretera y el río sin caer.',
 'Salta entre coches y camiones, súbete a troncos y tortugas y llega a las cinco casas antes de que se acabe el tiempo. Cada nivel el tráfico y la corriente van más rápido.',
 'ARCADE', 'cover-frogger', 'green', 5);
