-- SPEC 15: un color por categoría de juego
alter table public.games drop constraint games_cat_check;
alter table public.games add constraint games_cat_check
  check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS','RACING','FIGHTING','PLATFORMER','MAZE','RHYTHM','SPORTS','STRATEGY'));
alter table public.games drop constraint games_color_check;
alter table public.games add constraint games_color_check
  check (color in ('green','cyan','magenta','yellow','orange','violet','red','blue','lime','pink','silver'));
update public.games set color = 'green' where id = 'arkanoid';
alter table public.games add constraint games_cat_color_check
  check ((cat, color) in (('ARCADE','green'),('PUZZLE','cyan'),('SHOOTER','magenta'),('VERSUS','yellow'),
    ('RACING','orange'),('PLATFORMER','violet'),('FIGHTING','red'),('MAZE','blue'),
    ('SPORTS','lime'),('RHYTHM','pink'),('STRATEGY','silver')));
