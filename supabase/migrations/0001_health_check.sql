create table public.health_check (
  id int primary key,
  ok boolean not null default true
);
alter table public.health_check enable row level security;
create policy "health_check lectura pública"
  on public.health_check for select to anon, authenticated using (true);
insert into public.health_check (id, ok) values (1, true);
