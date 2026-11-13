create table public.games (
  id text primary key,                       -- slug de la URL: "asteroids"
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover text not null,                       -- clase CSS: "cover-asteroids"
  color text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order int not null unique
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score int not null check (score between 0 and 1000000),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
create index scores_created_idx on public.scores (created_at desc);

create view public.game_stats with (security_invoker = true) as
select g.id as game_id,
       coalesce(max(s.score), 0)::int as best,
       count(s.id)::int as plays
from public.games g left join public.scores s on s.game_id = g.id
group by g.id;

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games lectura pública" on public.games
  for select to anon, authenticated using (true);
create policy "scores lectura pública" on public.scores
  for select to anon, authenticated using (true);
create policy "scores insert anónimo" on public.scores
  for insert to anon, authenticated
  with check (exists (select 1 from public.games g where g.id = game_id));
-- sin policies de update/delete en ninguna tabla; insert en games solo por migración
