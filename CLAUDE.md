# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online games platform to compete for points. App funcional: home, biblioteca, detalle, reproductor, salón de la fama, login, about + contacto, 4 juegos jugables (Asteroids, Tetris, Arkanoid, Snake) con leaderboard real en Supabase. Course project (Udemy, Section 8: Skills + Playwright MCP).

Workflow is Spec Driven Design using `/spec` and `/spec-impl` skills, installed via `npx skills@latest add Klerith/fernando-skills` (see README.md). Sibling project `../../Section 7.../arkanoid` used the same flow (specs in `specs/`).

## Specs

Specs en `specs/` (01 MVP pantallas, 02 homepage, 03 about/contacto, 04 Supabase cimientos, 05 Asteroids, 06 leaderboard y juegos: `06-leaderboard-y-juegos.md`, 07 Tetris + registro genérico de juegos: `07-tetris.md`, 08 Arkanoid con sonido y 5 niveles: `08-arkanoid.md`, 09 Snake con sprites de frutas: `09-snake.md`, 10 selector de skin integrado en el HUD: `10-hud-skins-integrados.md`, 11 botón de fin al Salón de la fama y reset del reproductor: `11-fin-leaderboard-y-reset.md`, 12 mando táctil para jugar en móvil: `12-controles-tactiles.md`). Leer la spec relevante y sus dependencias antes de implementar.

Buenas prácticas:

- Una spec por cambio: `specs/NN-nombre.md`. Crear con `/spec`, implementar con `/spec-impl`.
- Cabecera: Estado, Depende de, Fecha, Objetivo. Secciones: Por qué, Alcance (dentro/fuera), Plan, Criterios de aceptación, Decisiones, Riesgos.
- No salir del alcance; lo extra va a "Fuera de alcance" / spec futura.
- Un commit por paso (`NN-nombre: Paso N`). Al terminar, Estado → Implementado.

## Stack

Next.js 16.4.6 (App Router, `app/` at repo root, no `src/`), React 19.3, Tailwind CSS 4 (`@tailwindcss/turbopack`), TypeScript. Path alias `@/*` → repo root. Next.js has breaking changes vs. training data: read `node_modules/next/dist/docs/` before writing code.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — build / serve
- `ALLOWED_DEV_ORIGINS=<ip> npm run dev` — permite abrir el dev server desde el móvil en la LAN (`next.config.ts`; lista separada por comas, vacío por defecto).
- `npm run lint` — ESLint (flat config)
- Sin test runner. Prettier + `prettier-plugin-tailwindcss` (`.prettierrc.json`).

## Rutas (`app/`)

- `/`: home con hero, juegos destacados, features, actividad, estadísticas y CTA (`components/home/`).
- `/juegos`: biblioteca con todos los juegos de la tabla `games`, en tarjetas.
- `/juegos/[id]`: detalle de un juego (descripción, categoría, mejor puntuación, leaderboard). `[id]` = slug de `games.id`, p. ej. `asteroids`, `tetris`, `arkanoid`, `snake`. Lista completa en `references/implemented-games.md`.
- `/juegos/[id]/jugar`: reproductor con canvas y HUD (las opciones `live`, p. ej. skin, van dentro del HUD; las `restart`, en el overlay de pausa); guarda la puntuación al terminar. El `[id]` debe existir en `GAME_REGISTRY`. El menú de fin enlaza a `/salon-de-la-fama?juego=<id>`. Bajo el canvas pinta el mando táctil (`components/touch-controls.tsx`, solo `@media (pointer: coarse)`) según `touchControls` del registro; emite `KeyboardEvent` sintéticos en `window` y se desactiva en pausa/fin. Con `cacheComponents` Next oculta la página en vez de desmontarla (Activity), por eso `GamePlayer` resetea su estado en el cleanup de un efecto.
- `/salon-de-la-fama`: mejores puntuaciones (top 12) con una pestaña por juego (`components/hall-of-fame.tsx`). `?juego=<id>` elige la pestaña inicial (desconocido → la primera).
- `/login`: formulario de acceso de jugador (`components/auth-form.tsx`).
- `/about`: sobre la plataforma + formulario de contacto (Server Action `app/about/actions.ts`, Resend).

## Arquitectura

- `components/`: UI global (`nav`, `game-player`, `game-canvas`, `leaderboard`, `hall-of-fame`, `auth-form`, `library`, `game-card`…); `home/` y `about/` por sección.
- Juegos: un motor TS por juego en `lib/<juego>/` (`constants`, `engine`, `types`, `utils` + `entities`/`levels`/`sprites`/`skins` según juego). Contrato común en `lib/game-engine.ts` (`GameEngine`, `GameSnapshot`, `GameOption`, `TouchControls`). Registro en `lib/game-registry.ts` (`GAME_REGISTRY`, `getGameDefinition`): cada juego aporta un adaptador snapshot → HUD y su `touchControls` (d-pad + 0-2 acciones; los motores no deben filtrar `isTrusted`). Añadir juego = nuevo motor + entrada en el registro + migración seed (usar `/add-game`).
- Datos: `lib/games(.server).ts`, `lib/scores(.server).ts`, `lib/auth.tsx`, `lib/contact.ts`, `lib/home.ts`.
- Supabase: `lib/supabase/{client,server}.ts`, tipos en `database.types.ts`, migraciones en `supabase/migrations/NNNN_*.sql` (tablas `games`, `scores`, un seed por juego). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (+ clave de Resend); `.env*` ignorado por git.
- `references/` (solo lectura): `started-games/` fuentes originales, `source-assets/` sprites, `templates/` maqueta UI.

## Shared code

Reutilizar antes de crear código nuevo:

- `lib/game-engine.ts`: contrato común (`GameStatus`, `HudItem`, `GameSnapshot`, `GameCallbacks`, `GameEngine`, `GameOption`, `TouchControls`).
- `components/touch-controls.tsx`: mando táctil genérico, configurado por `touchControls` en el registro. Todo motor nuevo lo cumple vía adaptador.
- `lib/game-registry.ts`: único punto de alta de juegos (`GAME_REGISTRY`, `getGameDefinition`); UI genérica, sin ramas por juego.
- `components/game-player.tsx` + `components/game-canvas.tsx`: reproductor y canvas compartidos por todos los juegos.
- `components/leaderboard.tsx`, `hall-of-fame.tsx`, `score-empty.tsx`, `data-error.tsx`, `game-card.tsx`, `library.tsx`: UI de scores/listados genérica.
- `lib/games(.server).ts`, `lib/scores(.server).ts`: acceso a datos `games`/`scores` (client vs server).
- `lib/supabase/{client,server}.ts` + `database.types.ts`: únicos clientes Supabase; regenerar tipos tras cada migración.
- `lib/auth.tsx`: estado/sesión de jugador.
- Cada `lib/<juego>/utils.ts`/`constants.ts`: helpers y dimensiones propios del juego; no duplicar entre juegos, promover a `lib/` si se repite.
- Lista de juegos existentes: `references/implemented-games.md` (actualizar al añadir uno).

## Skills

- `/spec` y `/spec-impl`: flujo Spec Driven (config en `specs/.spec-config.yml`, `AutoCreateBranch: true` crea rama `spec-NN-slug`).
- `/frontend-design`: usar siempre para diseñar interfaces de usuario.
- `/add-game` (propia, `.claude/skills/add-game/`: `SKILL.md`, `template.md`, `checklist.md`): genera la spec para añadir un juego real (motor TS, fila en `games`, leaderboard en `scores`) desde `references/started-games/` o nuevo, siguiendo SPEC 05 y 06; luego se implementa con `/spec-impl`. Admite `cat` ARCADE/PUZZLE/SHOOTER/VERSUS/RACING/FIGHTING/PLATFORMER/MAZE/RHYTHM/SPORTS/STRATEGY y `color` cyan/magenta/yellow/green/orange/violet/red; los no soportados aún por BD/código (solo los 4+4 originales) añaden a la spec un paso de ampliación de CHECK, `lib/games.ts` y CSS. Sin `disable-model-invocation` para poder precargarse en el subagente `game-jam` (el modelo principal también puede invocarlo); su "Modo game-jam" (no interactivo) lo aplica `game-jam` o se activa con `args` que empiezan por `game-jam:`.

## Tooling de Claude

- Hook `PostToolUse` (`.claude/settings.json` → `.claude/hooks/format-lint.mjs`): tras Write/Edit/MultiEdit ejecuta Prettier y ESLint `--fix`; ignora `references/`, `.claude/`, `.agents/`, `.next/`, `node_modules/`. Si falla, corregir antes de seguir.
- MCP (`.mcp.json`): Supabase (docs, database, migraciones, tipos). Playwright MCP para validar UI; screenshots en `.playwright-screenshots/` (gitignored).
- Subagente `game-planner` (`.claude/agents/game-planner.md`, `memory: project`): decide qué juego encaja; usar antes de `/add-game`. Memoria en `.claude/agent-memory/game-planner/` (`MEMORY.md`, `suggestions.md`); vuelca sugerencias en `references/game-suggestions-todo.md` (excepción: única escritura del agente en `references/`).
- Subagente `game-jam` (`.claude/agents/game-jam.md`): dado un tema, diseña un juego original y escribe ≥2 specs (motor, plataforma, extra opcional) en `specs/game-jam/<game-id>/`, formato SPEC 07-09. Precarga el skill `/add-game` (`skills:` en el frontmatter) y genera con él el spec core en modo game-jam. Solo escribe specs; se implementan después con `/spec-impl`.
- Subagente `skin-designer` (`.claude/agents/skin-designer.md`): aplica ≥3 skins (`classic` default, `retro`, `neon`, legibles en modo oscuro) solo al juego que se le indique, siguiendo el patrón de Tetris (`lib/<juego>/skins.ts`, opción `skin` `live` en el registro, `setSkin` en el motor). Un juego por invocación; verifica con Playwright. Estado por juego en `references/games-with-themes.md` (excepción: única escritura del agente en `references/`).
- Mantener README.md sincronizado cuando cambie este archivo.
