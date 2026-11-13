# SPEC 06 — Tabla `games` y leaderboard real en Supabase (solo Asteroids)

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (pantallas, reproductor, modal de fin de juego), SPEC 02 (home), SPEC 04 (clientes y migraciones de Supabase), SPEC 05 (Asteroids, único juego real)
> **Fecha:** 2026-11-13
> **Objetivo:** Mover el catálogo a una tabla `games` de Supabase que contiene solo Asteroids (el único juego real) y guardar y leer sus puntuaciones en una tabla `scores`, mostrando el leaderboard real en el Salón de la Fama, la ficha del juego y la actividad de la home.

---

## Por qué existe esta spec

El catálogo vive en `lib/games.ts` (array `GAMES` con 9 juegos), las puntuaciones se escriben en `localStorage["av_scores"]` sin leerse nunca, y Salón, ficha y home muestran datos seeded (`seededScores`, `lib/home.ts`). De los 9 juegos solo Asteroids es real; los otros 8 son simulaciones con cifras falsas. SPEC 04 dejó Supabase conectado con `public` vacío. Esta spec crea el primer esquema de negocio y elimina todo lo simulado: la BD es la única fuente y solo contiene datos reales.

---

## Alcance

**Dentro:**

- Migraciones SQL en `supabase/migrations/`:
  - `0003_games_scores.sql`: tablas `games` y `scores`, vista `game_stats`, RLS e índices.
  - `0004_seed_asteroids.sql`: una única fila en `games` (`asteroids`).
- Tabla `games` como **fuente única** del catálogo: biblioteca, home, ficha, reproductor y Salón leen de Supabase. En BD solo existe Asteroids.
- Eliminar del código los 8 juegos simulados: el array `GAMES`, el `getGame` síncrono, la simulación del reproductor (`setInterval`, arena simulada) y los datos mock (`seededScores`, `RECENT_SCORES`, `TOP_PLAYERS`).
- `best` y `plays` **derivados** de `scores` (vista `game_stats`); sin columnas mock. Empiezan en 0.
- Tabla `scores` con insert anónimo (nombre libre, sin auth) protegido por RLS y CHECKs.
- Guardado: "GUARDAR PUNTUACIÓN" inserta en `scores`; se elimina `saveScore` y `av_scores` de `localStorage`.
- Leaderboard real (con estado vacío "AÚN SIN PUNTUACIONES") en:
  - `/salon-de-la-fama`: puntuaciones de Asteroids (top 12).
  - `/juegos/[id]`: top 10 del juego.
  - Sección "ACTIVIDAD EN VIVO" de la home: últimas 8 puntuaciones y top 5 de las últimas 24 h.
- Páginas que hoy son estáticas (`generateStaticParams` sobre `GAMES`) pasan a render dinámico por petición, con estado de error genérico si Supabase falla.
- Regenerar `lib/supabase/database.types.ts` y revisar `get_advisors`.
- Añadir la spec 06 a `CLAUDE.md` y a la tabla "Specs" de `README.md` en el mismo cambio.

**Fuera de alcance (specs futuras):**

- Supabase Auth, `proxy.ts`, ligar puntuaciones a `user_id`; el jugador sigue siendo un nombre libre.
- Server Action, rate limit o cualquier medida anti-trampa más allá de RLS y CHECKs (las puntuaciones son falsificables, riesgo aceptado).
- Añadir otros juegos (cuando haya un juego real nuevo, se inserta con una migración y su motor).
- Limpiar CSS de portadas de los juegos eliminados (`cover-*` en `app/globals.css`) y rediseñar filtros de categoría para un catálogo de un solo juego.
- Leaderboard global como pantalla propia, paginación o filtros por fecha o jugador.
- Realtime / actualización en vivo de la actividad.
- Editar o borrar puntuaciones; moderación de nombres.
- Importar `av_scores` existentes de `localStorage`.
- UI de administración de `games`.
- Tests automatizados.

---

## Modelo de datos

```sql
-- supabase/migrations/0003_games_scores.sql
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
```

```sql
-- supabase/migrations/0004_seed_asteroids.sql
-- insert en public.games de la fila 'asteroids' con los mismos title/short/long/cat/cover/color
-- que la entrada actual de lib/games.ts (cat 'SHOOTER', cover 'cover-asteroids', color 'magenta'), sort_order 1.
```

```ts
// lib/games.ts (sin GAMES; tipos y lecturas del servidor)
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: AccentColor;
  best: number; // de game_stats
  plays: number; // de game_stats
}

export const CATS: ("TODOS" | Category)[]; // se mantiene
export async function getGames(): Promise<Game[]>; // orden por sort_order
export async function getGame(id: string): Promise<Game | null>;
export function formatPlays(n: number): string; // 0 → "0", 12400 → "12,4K"
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}
export interface RecentScore {
  player: string;
  gameTitle: string;
  color: AccentColor;
  score: number;
  createdAt: string;
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>; // servidor
export async function getRecentScores(limit: number): Promise<RecentScore[]>; // servidor
export async function getTopLast24h(
  limit: number,
): Promise<{ player: string; score: number }[]>; // servidor
export async function submitScore(e: {
  gameId: string;
  name: string;
  score: number;
}): Promise<boolean>; // cliente
```

Convenciones:

- `date` de `ScoreRow` formateada `dd/mm/aaaa` con `es-ES` y zona UTC fija para evitar hydration mismatch.
- Orden del ranking: `score desc, created_at asc`; `rank` se asigna al leer (posiciones consecutivas, sin empates).
- `getTopScores`, `getRecentScores` y `getTopLast24h` usan `lib/supabase/server.ts`; `submitScore` usa `lib/supabase/client.ts`.
- El nombre vacío del modal se sustituye por `"INVITADO"` antes de insertar (máx. 10 caracteres, mayúsculas, como hoy).
- Un fallo de lectura muestra un estado de error genérico; nunca el detalle de Supabase.
- Un fallo de `submitScore` mantiene el modal abierto con "NO SE PUDO GUARDAR · REINTENTA" y permite reintentar.
- Portadas y colores siguen siendo clases CSS (`cover-*`, `neon-*`); la BD solo guarda el nombre.
- Toda tabla nueva en `public` lleva RLS desde su migración y `database.types.ts` se regenera tras migrar.

---

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` lo relativo a render dinámico, `cookies()`, datos en Server Components y `generateStaticParams`. Crear `0003_games_scores.sql` y aplicarla con `apply_migration`; regenerar `lib/supabase/database.types.ts`; ejecutar `get_advisors` (security). Verificación: `list_tables` muestra `games` y `scores` con RLS activo; sin advisors críticos; `npx tsc --noEmit` pasa.
2. Crear y aplicar `0004_seed_asteroids.sql`. Verificación: `select id from games` devuelve solo `asteroids`; `game_stats` devuelve `best` 0 y `plays` 0.
3. Añadir en `lib/games.ts` `getGames`, `getGame` asíncrono (nombre temporal si choca con el síncrono) y `formatPlays`, **sin quitar aún `GAMES`**. Verificación: `npx tsc --noEmit` y `npm run lint` pasan; la app sigue igual.
4. Migrar biblioteca (`app/juegos/page.tsx`, `components/library.tsx`) y `components/home/games-section.tsx` para recibir `Game[]` de `getGames()` por props, con `best` y `plays` derivados y estado de error. Verificación: `/juegos` muestra 1 tarjeta (ASTEROIDS) con `0`; la home muestra 1 tarjeta.
5. Migrar `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx` a `getGame(id)` dinámico (`notFound()` si no existe), sin `generateStaticParams`. Verificación: `/juegos/asteroids` y `/juegos/asteroids/jugar` cargan; `/juegos/bloque-buster` da 404.
6. Migrar `components/hall-of-fame.tsx` y `app/salon-de-la-fama/page.tsx` para recibir `games` por props; eliminar `GAMES` y el `getGame` síncrono. Verificación: `grep -r "GAMES" app components lib` sin resultados; `npm run build` pasa.
7. Simplificar `components/game-player.tsx`: eliminar la simulación (`simScore`, `simPaused`, `setInterval`, arena simulada) y dejar solo el canvas de Asteroids. Verificación: `/juegos/asteroids/jugar` funciona igual (pausa, FIN, modal); `npx tsc --noEmit` y `npm run lint` pasan.
8. Añadir en `lib/scores.ts` `getTopScores`, `getRecentScores`, `getTopLast24h` y `submitScore`; eliminar `saveScore` y `seededScores`; el modal guarda con `submitScore` y maneja el fallo. Verificación: jugar, perder, guardar con "TEST" crea una fila en `scores`; con nombre vacío se guarda "INVITADO".
9. Leaderboard real en ficha y Salón con `getTopScores` (10 y 12), estado vacío "AÚN SIN PUNTUACIONES" y de error; `key` de `Leaderboard` pasa a `rank`. Aplicar `/frontend-design` a los estados vacío y de error. Verificación: la puntuación del paso 8 aparece en `/juegos/asteroids` y en el Salón, y la tarjeta muestra `best` y `plays` actualizados.
10. Actividad de la home: `components/home/activity-section.tsx` lee `getRecentScores(8)` y `getTopLast24h(5)` con estados vacío y de error; borrar `RECENT_SCORES` y `TOP_PLAYERS` de `lib/home.ts`. Verificación: la puntuación de prueba aparece en ambas tarjetas; con `scores` vacía aparece el mensaje vacío.
11. Limpieza de datos de prueba (`delete from scores` con `execute_sql`) y actualizar `CLAUDE.md` y `README.md` con la spec 06 en el mismo commit. Verificación: ambos mencionan `06-leaderboard-y-juegos.md`; `npm run lint` y `npm run build` pasan.

Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` según `AGENTS.md`. Para el diseño visual (estados vacío y de error) aplicar `/frontend-design`, según `CLAUDE.md`. Las verificaciones de UI se hacen con Playwright.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `supabase/migrations/` contiene `0003_games_scores.sql` y `0004_seed_asteroids.sql`, y ambas figuran en `list_migrations`.
- [ ] `games` tiene exactamente 1 fila (`asteroids`) con el mismo título, `cat`, `cover` y `color` que tenía en `lib/games.ts`.
- [ ] `games` y `scores` tienen RLS activo y `get_advisors` (security) no reporta tablas sin RLS ni otros avisos críticos.
- [ ] Con la clave publishable, un insert en `scores` con `game_id` inexistente, `score` negativo, `score` > 1000000, `player_name` vacío o de más de 10 caracteres falla.
- [ ] Con la clave publishable, `update` y `delete` sobre `scores` y cualquier `insert`/`update`/`delete` sobre `games` no afectan filas.
- [ ] `lib/supabase/database.types.ts` incluye `games`, `scores` y `game_stats`.
- [ ] No existen `GAMES`, `getGame` síncrono, `saveScore`, `seededScores`, `RECENT_SCORES` ni `TOP_PLAYERS`: `grep -r` sin resultados en `app`, `components` y `lib`.
- [ ] `/juegos` y la home muestran solo ASTEROIDS, leído de la BD, con `best` y `plays` en 0 al inicio.
- [ ] `/juegos/asteroids` carga y "JUGAR AHORA" lleva a `/juegos/asteroids/jugar`.
- [ ] `/juegos/bloque-buster`, `/juegos/rocas` y cualquier id inexistente (ficha y `/jugar`) devuelven 404.
- [ ] El tab del Salón y la ficha solo muestran Asteroids.
- [ ] Guardar una puntuación con nombre "TEST" añade una fila en `scores` con `game_id = 'asteroids'` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] Guardar con el nombre vacío inserta `player_name = 'INVITADO'`.
- [ ] Si el insert falla, el modal sigue abierto y muestra "NO SE PUDO GUARDAR · REINTENTA".
- [ ] Tras guardar, la ficha y el Salón muestran la puntuación en el top y la tarjeta muestra `best` y `plays` actualizados.
- [ ] Dos puntuaciones iguales se ordenan por antigüedad y reciben posiciones consecutivas distintas.
- [ ] Con `scores` vacía, ficha, Salón y actividad de la home muestran el mensaje vacío.
- [ ] "ÚLTIMAS PUNTUACIONES" muestra hasta 8 filas de más reciente a más antigua; "TOP JUGADORES · HOY" muestra hasta 5 de las últimas 24 h por puntuación.
- [ ] `localStorage["av_scores"]` ya no se escribe.
- [ ] Asteroids se juega igual que en SPEC 05 (pausa, FIN, modal, guardado) tras eliminar la simulación del reproductor.
- [ ] Si Supabase no responde (clave inválida), biblioteca, ficha, Salón y home muestran un error genérico sin texto del error de Supabase.
- [ ] No hay hydration warnings ni errores en la consola en `/`, `/juegos`, `/juegos/asteroids`, `/juegos/asteroids/jugar` y `/salon-de-la-fama`.
- [ ] Ninguna service role key ni secreto de Supabase aparece en el repo ni en `.next/static`.
- [ ] Tras la verificación, `scores` queda vacía y `lib/auth.tsx`, `lib/asteroids/` y `references/started-games/` no han cambiado.

---

## Decisiones

- **Sí:** tabla `games` como fuente única del catálogo (decisión del usuario). Una sola verdad, FK real para `scores`.
- **Sí:** en BD solo Asteroids, el único juego real (decisión del usuario). Los 8 simulados se eliminan del catálogo, no se siembran.
- **No:** sembrar los 8 simulados con una marca `real_scores`. Es lo que proponía el borrador anterior; el usuario lo descartó.
- **No:** mantener `lib/games.ts` como fallback. Dos fuentes de verdad y más código; un fallo de BD muestra error.
- **Sí:** eliminar la simulación del reproductor y todos los datos mock (`seededScores`, `RECENT_SCORES`, `TOP_PLAYERS`). Sin juegos simulados quedan sin uso.
- **Sí:** puntuaciones, leaderboard y actividad solo de datos reales de Asteroids (decisión del usuario).
- **Sí:** `games.id` es el slug de la URL (`text`). Mantiene `/juegos/asteroids` sin migrar enlaces.
- **Sí:** cover y color como nombre de clase en columna; el estilo sigue en `app/globals.css`.
- **Sí:** `best` y `plays` derivados de `scores` con la vista `game_stats`. Sin columnas mock ni triggers.
- **Sí:** jugador identificado solo por nombre libre, sin auth. Auth es una spec propia; `scores` no lleva `user_id`.
- **Sí:** insert anónimo con RLS + CHECKs, sin Server Action ni rate limit. Riesgo aceptado: puntuaciones falsificables.
- **Sí:** la RLS de insert exige que el `game_id` exista en `games`; la FK refuerza lo mismo.
- **Sí:** lectura pública de `scores` y `games`. Necesaria para el leaderboard; sin datos sensibles.
- **Sí:** leaderboard en Salón, ficha y actividad de la home.
- **Sí:** render dinámico por petición con error genérico. Los datos se ven al instante tras guardar y el build no depende de la BD.
- **No:** ISR con `revalidate`. Datos viejos tras guardar y build acoplado a Supabase.
- **Sí:** nombre vacío se guarda como `"INVITADO"`, respetando el CHECK de 1 a 10 caracteres.
- **Sí:** `submitScore` en cliente. El modal ya es Client Component y una Server Action no aporta seguridad sin auth.
- **No:** importar `av_scores` antiguos. Se escribían sin leerse y mezclaban juegos simulados.
- **No:** limpiar CSS de portadas ni rediseñar filtros de categoría. Alcance extra; queda para otra spec.

---

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Puntuaciones falsificables (cualquiera inserta con la publishable key)                    | Riesgo aceptado; CHECKs de rango y nombre, FK a `games`; auth/anti-trampa en spec futura.                                |
| El catálogo queda con un solo juego: biblioteca, home y chips de categoría parecen vacíos | Aceptado por decisión del usuario; chips y diseño del catálogo se revisan en una spec futura (fuera de alcance).         |
| Spec toca varias áreas (BD, catálogo, biblioteca, ficha, Salón, home, reproductor)        | Plan en pasos pequeños con `GAMES` conviviendo hasta el paso 6; cada paso deja la app funcional y es commiteable.        |
| Quitar `GAMES` y la simulación rompe consumidores no detectados                           | `grep` y `npx tsc --noEmit` tras los pasos 6 a 8; criterio de aceptación sin referencias.                                |
| Enlaces antiguos a juegos eliminados (`/juegos/rocas`, etc.)                              | Devuelven 404 (criterio de aceptación).                                                                                  |
| Next 16 cambia el render dinámico respecto al conocimiento previo                         | Leer `node_modules/next/dist/docs/` en el paso 1; el cliente de servidor usa `cookies()`, lo que fuerza render dinámico. |
| Si Supabase cae, toda la app queda sin catálogo                                           | Error genérico por sección; riesgo aceptado al descartar el fallback local.                                              |
| Hydration mismatch en fechas o tiempos relativos                                          | Formato `es-ES` con zona UTC fija; el tiempo relativo se calcula en servidor.                                            |
| Vista sin `security_invoker` salta RLS                                                    | `with (security_invoker = true)` y comprobación con `get_advisors`.                                                      |
| Spam o nombres ofensivos en el leaderboard público                                        | Fuera de alcance (moderación); límite de 10 caracteres; filas borrables a mano con `execute_sql`.                        |
| Datos de prueba quedan en la BD                                                           | Paso 11 borra `scores`; criterio "`scores` queda vacía".                                                                 |
| Tipos desactualizados tras migrar                                                         | Regenerar `database.types.ts` en el paso 1 y tras cualquier cambio de esquema.                                           |

---

## Qué **no** está en esta spec

- Supabase Auth, `user_id` en `scores` o `proxy.ts`.
- Server Action, rate limit o medidas anti-trampa.
- Otros juegos además de Asteroids.
- Limpieza del CSS de portadas eliminadas ni rediseño de filtros de categoría.
- Leaderboard global como pantalla propia, paginación o filtros.
- Realtime, Storage, Edge Functions.
- Moderación o edición de puntuaciones y nombres.
- Importación de `av_scores` desde `localStorage`.
- UI de administración de `games`.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
