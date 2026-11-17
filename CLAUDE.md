# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online games platform to compete for points. App funcional: home, biblioteca, detalle, reproductor, salón de la fama, login, about + contacto, 4 juegos jugables (Asteroids, Tetris, Arkanoid, Snake) con leaderboard real en Supabase. Course project (Udemy, Section 8: Skills + Playwright MCP).

Workflow is Spec Driven Design using `/spec` and `/spec-impl` skills, installed via `npx skills@latest add Klerith/fernando-skills` (see README.md). Sibling project `../../Section 7.../arkanoid` used the same flow (specs in `specs/`).

## Specs

Specs en `specs/` (01 MVP pantallas, 02 homepage, 03 about/contacto, 04 Supabase cimientos, 05 Asteroids, 06 leaderboard y juegos: `06-leaderboard-y-juegos.md`, 07 Tetris + registro genérico de juegos: `07-tetris.md`, 08 Arkanoid con sonido y 5 niveles: `08-arkanoid.md`, 09 Snake con sprites de frutas: `09-snake.md`). Leer la spec relevante y sus dependencias antes de implementar.

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
- `npm run lint` — ESLint (flat config)
- Sin test runner. Prettier + `prettier-plugin-tailwindcss` (`.prettierrc.json`).

## Rutas (`app/`)

- `/` home · `/juegos` biblioteca · `/juegos/[id]` detalle · `/juegos/[id]/jugar` reproductor
- `/salon-de-la-fama` · `/login`
- `/about` + formulario de contacto (Server Action `app/about/actions.ts`, Resend)

## Arquitectura

- `components/`: UI global (`nav`, `game-player`, `game-canvas`, `leaderboard`, `hall-of-fame`, `auth-form`, `library`, `game-card`…); `home/` y `about/` por sección.
- Juegos: un motor TS por juego en `lib/<juego>/` (`constants`, `engine`, `types`, `utils` + `entities`/`levels`/`sprites`/`skins` según juego). Contrato común en `lib/game-engine.ts` (`GameEngine`, `GameSnapshot`, `GameOption`). Registro en `lib/game-registry.ts` (`GAME_REGISTRY`, `getGameDefinition`): cada juego aporta un adaptador snapshot → HUD. Añadir juego = nuevo motor + entrada en el registro + migración seed (usar `/add-game`).
- Datos: `lib/games(.server).ts`, `lib/scores(.server).ts`, `lib/auth.tsx`, `lib/contact.ts`, `lib/home.ts`.
- Supabase: `lib/supabase/{client,server}.ts`, tipos en `database.types.ts`, migraciones en `supabase/migrations/NNNN_*.sql` (tablas `games`, `scores`, un seed por juego). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (+ clave de Resend); `.env*` ignorado por git.
- `references/` (solo lectura): `started-games/` fuentes originales, `source-assets/` sprites, `templates/` maqueta UI.

## Skills

- `/spec` y `/spec-impl`: flujo Spec Driven (config en `specs/.spec-config.yml`, `AutoCreateBranch: true` crea rama `spec-NN-slug`).
- `/frontend-design`: usar siempre para diseñar interfaces de usuario.
- `/add-game` (propia, `.claude/skills/add-game/`: `SKILL.md`, `template.md`, `checklist.md`): genera la spec para añadir un juego real (motor TS, fila en `games`, leaderboard en `scores`) desde `references/started-games/` o nuevo, siguiendo SPEC 05 y 06; luego se implementa con `/spec-impl`.

## Tooling de Claude

- Hook `PostToolUse` (`.claude/settings.json` → `.claude/hooks/format-lint.mjs`): tras Write/Edit/MultiEdit ejecuta Prettier y ESLint `--fix`; ignora `references/`, `.claude/`, `.agents/`, `.next/`, `node_modules/`. Si falla, corregir antes de seguir.
- MCP (`.mcp.json`): Supabase (docs, database, migraciones, tipos). Playwright MCP para validar UI; screenshots en `.playwright-screenshots/` (gitignored).
- Mantener README.md sincronizado cuando cambie este archivo.
