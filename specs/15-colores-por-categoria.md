# SPEC 15 — Un color por categoría de juego

> **Estado:** Aprobado
> **Depende de:** SPEC 04 (Supabase cimientos), SPEC 06 (leaderboard y juegos), SPEC 07 (registro de juegos)
> **Fecha:** 2026-11-19
> **Objetivo:** Que cada categoría tenga un color de acento fijo y único, aplicado en BD, código, UI y en los agentes/skills que dan de alta o proponen juegos.

---

## Por qué existe esta spec

- `/add-game` y `game-jam` permiten 11 categorías y 7 colores elegidos a mano: el color no dice nada del género.
- ARCADE ya mezcla `yellow` (Arkanoid) y `green` (Snake, Frogger).
- BD y `lib/games.ts` solo admiten 4 categorías y 4 colores; cada juego nuevo con otro valor obliga a un paso "Categoría o color nuevo" (crater-rally lo arrastra).
- `game-card.tsx` solo distingue `magenta`/`yellow` en el botón (green sale cyan).
- `references/game-suggestions-todo.md` usa colores Tailwind sueltos (blue, amber, rose, slate…) fuera de la paleta.

## Mapa categoría → color

| Categoría  | Color     | Hex (orientativo, afinar con `/frontend-design`) |
| ---------- | --------- | ------------------------------------------------ |
| ARCADE     | `green`   | `#00ff88` (existente)                            |
| PUZZLE     | `cyan`    | `#00f5ff` (existente)                            |
| SHOOTER    | `magenta` | `#ff006e` (existente)                            |
| VERSUS     | `yellow`  | `#f5ff00` (existente)                            |
| RACING     | `orange`  | `#ff8a00`                                        |
| PLATFORMER | `violet`  | `#a855ff`                                        |
| FIGHTING   | `red`     | `#ff2d3d`                                        |
| MAZE       | `blue`    | `#2f7bff`                                        |
| SPORTS     | `lime`    | `#b6ff00`                                        |
| RHYTHM     | `pink`    | `#ff7ad9`                                        |
| STRATEGY   | `silver`  | `#c8d0e0`                                        |

Juegos actuales: Asteroids SHOOTER magenta (igual), Tetris PUZZLE cyan (igual), Arkanoid ARCADE **yellow → green**, Snake y Frogger ARCADE green (igual).

---

## Alcance

**Dentro:**

- Migración `0009_colores_por_categoria.sql`: ampliar CHECK de `cat` (11) y `color` (11), `update` de Arkanoid a `green`, nuevo CHECK `games_cat_color_check` del par (cat, color).
- `lib/games.ts`: `Category` y `AccentColor` con los 11 valores, `CATEGORY_COLOR: Record<Category, AccentColor>` como fuente única en código, `CATEGORIES` ordenado.
- `components/library.tsx`: chips = `TODOS` + categorías con al menos un juego (en orden de `CATEGORIES`), para no mostrar 7 chips vacíos.
- `components/game-card.tsx`: botón con clase `btn <color>` para cualquier color (sin ternario).
- `app/globals.css`: variables `--orange --violet --red --blue --lime --pink --silver`; `.btn.<color>` y `.neon-<color>` para los 11 colores (mismas variantes que hoy, legibles en oscuro; `/frontend-design`).
- Skills/agentes: `.claude/skills/add-game/{SKILL,checklist,template}.md`, `.claude/agents/game-jam.md`, `.claude/agents/game-planner.md` → el color no se elige, se deriva de `cat` con el mapa; quitar el paso "Categoría o color nuevo".
- `references/game-suggestions-todo.md`: recolorear las 22 sugerencias según el mapa.
- `specs/game-jam/crater-rally/01-crater-rally-core.md`: quitar su paso de ampliación de CHECK (`0009_extend_games_checks.sql`), seed pasa a `0010_seed_crater_rally.sql`, color `violet` por mapa.
- `CLAUDE.md` + `README.md`: SPEC 15 en la lista, regla de color por categoría en `/add-game`/`game-jam`/`game-planner`.

**Fuera:**

- Eliminar la columna `games.color` o derivarla en BD (generated column/trigger).
- Recolorear portadas (`.cover-*`), canvas o skins de los juegos.
- `feature-card`/`highlight` de la home (colores decorativos, no de juego).
- Colores de la vista `game_stats` u otras tablas; cambios en `scores`.
- Specs ya implementadas (05-14, frogger): históricas, no se reescriben.
- Implementar crater-rally o juegos sugeridos.

---

## Modelo de datos

```sql
-- 0009_colores_por_categoria.sql
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
```

(Comprobar el nombre real de los CHECK con `execute_sql` sobre `pg_constraint` antes de aplicar.)

```ts
// lib/games.ts
export const CATEGORIES = [
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
  "RACING",
  "FIGHTING",
  "PLATFORMER",
  "MAZE",
  "RHYTHM",
  "SPORTS",
  "STRATEGY",
] as const;
export type Category = (typeof CATEGORIES)[number];
export type AccentColor =
  | "green"
  | "cyan"
  | "magenta"
  | "yellow"
  | "orange"
  | "violet"
  | "red"
  | "blue"
  | "lime"
  | "pink"
  | "silver";
export const CATEGORY_COLOR: Record<Category, AccentColor> = {
  ARCADE: "green",
  PUZZLE: "cyan" /* … mapa completo */,
};
```

`CATS` se sustituye por `CATEGORIES` (la lista de chips la calcula `library.tsx`).

---

## Plan de implementación

1. **Migración BD.**
   - Crear `supabase/migrations/0009_colores_por_categoria.sql`; aplicar con `apply_migration`; regenerar `lib/supabase/database.types.ts`.
   - Verificación: `list_migrations` incluye 0009; `select id, cat, color from games` → arkanoid green, resto igual; `insert` de prueba con `('ARCADE','cyan')` falla por `games_cat_color_check` (en transacción con rollback); `get_advisors` security sin avisos nuevos.
2. **Tipos y mapa en `lib/games.ts`.**
   - `CATEGORIES`, `Category`, `AccentColor`, `CATEGORY_COLOR`; quitar `CATS`; ajustar `library.tsx` (chips por categorías presentes).
   - Verificación: `npx tsc --noEmit` y `npm run lint` limpios; `/juegos` muestra chips TODOS, ARCADE, PUZZLE, SHOOTER y filtran bien.
3. **UI de acento.**
   - `game-card.tsx` → `"btn " + game.color`; `globals.css`: 7 variables nuevas + `.btn.<color>` y `.neon-<color>` de los 11 (`/frontend-design`).
   - Verificación: Playwright en `/juegos` (escritorio y 390×844): botones JUGAR verdes en Arkanoid/Snake/Frogger, cyan Tetris, magenta Asteroids; home actividad con nombres en el color del juego; captura en `.playwright-screenshots/spec15-juegos.png`.
4. **Skill `/add-game`.**
   - `SKILL.md`, `checklist.md`, `template.md`: `color = CATEGORY_COLOR[cat]` (tabla del mapa), no se pregunta ni elige; borrar sección/paso "Categoría o color nuevo"; seed con color del mapa.
   - Verificación: `grep -n "Categoría o color nuevo\|violet|red" .claude/skills/add-game` sin restos de la lista antigua; tabla del mapa presente y idéntica a esta spec.
5. **Agentes `game-jam` y `game-planner`.**
   - `game-jam.md`: color derivado del mapa, sin paso de ampliación, quitar "salvo ampliar los CHECK". `game-planner.md`: columna Color = color del mapa según categoría (no Tailwind libre).
   - Verificación: grep de "Tailwind" y de la lista de 7 colores en `.claude/agents/` sin resultados; ambos citan `CATEGORY_COLOR` / mapa de SPEC 15.
6. **Datos de referencia y crater-rally.**
   - `references/game-suggestions-todo.md`: recolorear (pong/breakout-dual lime, pacman/bomberman blue, invaders/galaga/missile-command magenta, donkey-kong-lite/moon-patrol violet, road-fighter orange, PUZZLE cyan, ARCADE green). `crater-rally/01`: quitar paso 2 de ampliación, seed `0010`, decisiones/riesgos coherentes.
   - Verificación: cada fila del to-do cumple el mapa (revisión manual tabla vs mapa); crater-rally sin `0009_extend_games_checks`.
7. **Docs.**
   - `CLAUDE.md` (lista de specs, `/add-game`: color por categoría, sin paso de ampliación) y `README.md` sincronizado; Estado → Implementado.
   - Verificación: `npm run build` OK; README y CLAUDE.md mencionan SPEC 15.

---

## Criterios de aceptación

- [ ] BD admite las 11 categorías y 11 colores y rechaza cualquier par (cat, color) fuera del mapa.
- [ ] `games` tiene los 5 juegos con color del mapa (arkanoid `green`).
- [ ] `lib/games.ts` exporta `CATEGORIES`, `CATEGORY_COLOR` con los 11 pares; `tsc`, `lint` y `build` limpios.
- [ ] En `/juegos` el botón JUGAR de cada tarjeta usa el color de su categoría; chips solo de categorías con juegos.
- [ ] `globals.css` define `--<color>`, `.btn.<color>` y `.neon-<color>` para los 11 colores.
- [ ] `/add-game`, `game-jam` y `game-planner` derivan el color de la categoría y no contienen el paso "Categoría o color nuevo" ni colores fuera del mapa.
- [ ] `references/game-suggestions-todo.md` y `crater-rally/01` usan solo colores del mapa.
- [ ] CLAUDE.md y README.md actualizados.

---

## Decisiones

- **Sí:** 11 colores únicos (4 nuevos: blue, lime, pink, silver). Razón: categoría reconocible por color sin ambigüedad.
- **Sí:** ARCADE = green. Razón: 2 de 3 juegos ARCADE ya son verdes; solo cambia Arkanoid.
- **Sí:** mantener columna `color` + CHECK del par + mapa TS. Razón: sin tocar consultas/tipos (`scores.server.ts`, vista), y BD impide inconsistencias.
- **No:** borrar `color` o columna generada. Razón: más cambios (vista `game_stats`, tipos, scores) sin beneficio visible.
- **Sí:** ampliar ya CHECK/tipos/CSS a todo. Razón: elimina el paso por juego de `/add-game` y la migración duplicada de crater-rally.
- **Sí:** chips de filtro solo para categorías con juegos. Razón: evitar 7 chips vacíos al ampliar `CATEGORIES`.
- **No:** reescribir specs implementadas. Razón: son históricas.

---

## Riesgos

| Riesgo                                                               | Mitigación                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Nombre de los CHECK distinto a `games_cat_check`/`games_color_check` | Consultar `pg_constraint` antes de aplicar                        |
| `silver`/`lime`/`yellow` poco contrastados o parecidos entre sí      | Afinar hex con `/frontend-design`; comprobar en captura           |
| Agentes con memoria antigua siguen proponiendo colores sueltos       | Instrucción explícita en `game-planner.md` + to-do ya recoloreado |
| Playwright MCP desconectado al implementar                           | Reintentar conexión; si no, verificación manual y anotarlo        |
