# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online games platform to compete for points. App funcional: home, biblioteca, detalle, reproductor, salón de la fama, login, about + contacto, 5 juegos jugables (Asteroids, Tetris, Arkanoid, Snake, Frogger) con leaderboard real en Supabase. Course project (Udemy, Section 8: Skills + Playwright MCP).

Workflow is Spec Driven Design using `/spec` and `/spec-impl` skills, installed via `npx skills@latest add Klerith/fernando-skills` (see README.md). Sibling project `../../Section 7.../arkanoid` used the same flow (specs in `specs/`).

## Specs

Specs en `specs/` (01 MVP pantallas, 02 homepage, 03 about/contacto, 04 Supabase cimientos, 05 Asteroids, 06 leaderboard y juegos: `06-leaderboard-y-juegos.md`, 07 Tetris + registro genérico de juegos: `07-tetris.md`, 08 Arkanoid con sonido y 5 niveles: `08-arkanoid.md`, 09 Snake con sprites de frutas: `09-snake.md`, 10 selector de skin integrado en el HUD: `10-hud-skins-integrados.md`, 11 botón de fin al Salón de la fama y reset del reproductor: `11-fin-leaderboard-y-reset.md`, 12 mando táctil para jugar en móvil: `12-controles-tactiles.md`, 13 aspecto Gamepad MK-II del mando (carcasa neón, cruz con hub, botones A/B): `13-gamepad-mk2.md`, 14 revisión de performance (≥58 FPS con CPU ×6, cachés de capa y sprites con glow): `14-revision-performance.md`, 15 un color fijo por categoría de juego (11 categorías ↔ 11 colores; migración `0009`, `CATEGORY_COLOR` en `lib/games.ts`, acentos `.btn.<color>`/`.neon-<color>`; `/add-game`, `game-jam` y `game-planner` derivan el color de `cat`): `15-colores-por-categoria.md`, 16 autenticación con Supabase Auth: registro con confirmación de email, login por email o usuario, Google/GitHub, recuperar contraseña, `profiles` y `scores.user_id` (migración `0010`): `16-autenticacion.md`, 17 medidas de seguridad básicas (migración `0012`, contraseña ≥8 con complejidad, reenvío de IP en Auth, headers, `/perfil` protegido en `proxy.ts`): `17-medidas-seguridad.md`, 18 solo los jugadores con sesión guardan puntuación (migración `0013`, `scores.user_id not null`, FK `on delete cascade`, el invitado juega pero no guarda): `18-solo-logueados-puntuan.md`). Game-jam Frogger en `specs/game-jam/frogger/` (01 motor TS en `lib/frogger/`: `01-frogger-core.md`; 02 plataforma, migración `0008`, portada, pausa botón + `P`/`Esc` y guardado: `02-frogger-platform.md`; 03 peligros y audio: `03-frogger-hazards-audio.md`). Leer la spec relevante y sus dependencias antes de implementar.

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
- `npm run perf` — mide FPS y JS/frame de los 5 juegos × skins con CPU ×1/×6 (Playwright, Chromium con ventana; requiere `npm run dev` activo; `PERF_URL`, `PERF_GAMES=a,b`, `PERF_HEADLESS=1`); sale con código 1 si algún caso con ×6 queda <58 FPS (SPEC 14).
- Sin test runner. Prettier + `prettier-plugin-tailwindcss` (`.prettierrc.json`).

## Rutas (`app/`)

- `/`: home con hero, juegos destacados, features, actividad, estadísticas y CTA (`components/home/`).
- `/juegos`: biblioteca con todos los juegos de la tabla `games`, en tarjetas.
- `/juegos/[id]`: detalle de un juego (descripción, categoría, mejor puntuación, leaderboard). `[id]` = slug de `games.id`, p. ej. `asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`. Lista completa en `references/implemented-games.md`.
- `/juegos/[id]/jugar`: reproductor con canvas y HUD (las opciones `live`, p. ej. skin, van dentro del HUD; las `restart`, en el overlay de pausa); guarda la puntuación al terminar solo con sesión (SPEC 18: `player_name` = username, sin input; el invitado ve "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" + botón a `/login` y esa puntuación se pierde; HUD "INVITADO" sin sesión). El `[id]` debe existir en `GAME_REGISTRY`. El menú de fin enlaza a `/salon-de-la-fama?juego=<id>`. Pinta el mando táctil con aspecto Gamepad MK-II (`components/touch-controls.tsx`, solo `@media (pointer: coarse)`; en móvil vertical va fijo al borde inferior para que el canvas ocupe el alto libre; direcciones sin tecla atenuadas, A/B con rótulo del registro, `.on` con teclado físico `isTrusted`) según `touchControls` del registro; emite `KeyboardEvent` sintéticos en `window` y se desactiva en pausa/fin. Con `cacheComponents` Next oculta la página en vez de desmontarla (Activity), por eso `GamePlayer` resetea su estado en el cleanup de un efecto.
- `/salon-de-la-fama`: mejores puntuaciones (top 12) con una pestaña por juego (`components/hall-of-fame.tsx`). `?juego=<id>` elige la pestaña inicial (desconocido → la primera).
- `/login`: acceso de jugador (`components/auth-form.tsx`, SPEC 16): iniciar sesión con email o usuario, crear cuenta (email de confirmación, sin sesión hasta confirmar), Google/GitHub, "¿Olvidaste tu contraseña?" (`components/forgot-password.tsx`) y "Jugar como invitado". Server Actions `signUp`/`signIn` en `app/login/actions.ts`. Con sesión redirige a `/`. `?error=oauth` muestra el fallo del callback; `?confirmed=1` muestra "Email confirmado" (enlace abierto en otro navegador). El nav con sesión muestra username + botón "Cerrar sesión".
- `/auth/callback` (`app/auth/callback/route.ts`): canjea el `code` (OAuth y enlace de confirmación) → `/`; fallo → `/login?error=oauth`; sin verificador PKCE (otro navegador) → `/login?confirmed=1`.
- `/perfil` (`components/profile-form.tsx`, SPEC 16): avatar grande, cambio de username (`updateUsername` de `useAuth()`; `A-Z0-9_` 3-10, único, en mayúsculas; las puntuaciones antiguas conservan su `player_name`) y botón "Cerrar sesión". Sin sesión → `/login`. El nav muestra un bloque avatar + nombre (`components/account-menu.tsx`) que despliega "Perfil" y "Cerrar sesión"; en móvil solo el avatar. `/perfil` tiene "Guardar usuario", "Salir" (sin guardar) y "Cerrar sesión".
- `/auth/reset-password`: canjea el `code` de recuperación y muestra el formulario de nueva contraseña (`components/reset-password-form.tsx`); sin código válido → error + enlace a `/login`.
- `/about`: sobre la plataforma + formulario de contacto (Server Action `app/about/actions.ts`, Resend).

## Arquitectura

- `components/`: UI global (`nav`, `game-player`, `game-canvas`, `leaderboard`, `hall-of-fame`, `auth-form`, `library`, `game-card`…); `home/` y `about/` por sección.
- Juegos: un motor TS por juego en `lib/<juego>/` (`constants`, `engine`, `types`, `utils` + `entities`/`levels`/`sprites`/`skins` según juego). Contrato común en `lib/game-engine.ts` (`GameEngine`, `GameSnapshot`, `GameOption`, `TouchControls`). Registro en `lib/game-registry.ts` (`GAME_REGISTRY`, `getGameDefinition`): cada juego aporta un adaptador snapshot → HUD y su `touchControls` (d-pad + 0-2 acciones; los motores no deben filtrar `isTrusted`). Añadir juego = nuevo motor + entrada en el registro + migración seed (usar `/add-game`).
- Datos: `lib/games(.server).ts`, `lib/scores(.server).ts`, `lib/auth.tsx`, `lib/auth-validation.ts`, `lib/contact.ts`, `lib/home.ts`.
- Supabase: `lib/supabase/{client,server,admin}.ts`, tipos en `database.types.ts`, migraciones en `supabase/migrations/NNNN_*.sql` (tablas `games`, `scores`, `profiles`, un seed por juego). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (solo servidor, SPEC 16; nunca `NEXT_PUBLIC_`) (+ clave de Resend); `.env*` ignorado por git.
- Auth (SPEC 16): `proxy.ts` en la raíz refresca la sesión (cookies, `@supabase/ssr`) y, desde SPEC 17, redirige a `/login` las rutas de `PROTECTED_ROUTES` (hoy solo `/perfil`) sin sesión, copiando las cookies del refresco; el resto es público (invitado intacto); no sustituye a RLS. `lib/supabase/admin.ts` (`server-only`, `service_role`) solo resuelve usuario → email vía `email_for_username` (ejecutable solo por `service_role`). El trigger `on_auth_user_created` crea el `profiles.username` (saneado `^[A-Z0-9_]{3,10}$`, sufijo numérico si choca). `scores.user_id` lo pone la BD (`default auth.uid()`), `not null` desde SPEC 18 (el invitado no guarda); si se borra el usuario (`auth.users`), `profiles` y sus puntuaciones se borran en cascada (`on delete cascade`, migración `0013`). Migraciones `0010_auth_profiles` y `0011_profiles_policy_initplan` (policy con `(select auth.uid())`). Avatar: `components/avatar.tsx` (foto de `user_metadata.avatar_url`/`picture` o iniciales sobre fondo neón estable por username). Supabase: "Confirm email" activado, proveedores Google/GitHub y Redirect URLs `/auth/callback` y `/auth/reset-password`.
- Seguridad (SPEC 17): migración `0012_seguridad` (`revoke execute` de `rls_auto_enable()`; policy de insert de `scores` con `user_id is null or user_id = auth.uid()`, sustituida en SPEC 18 por `scores insert usuario`: solo `authenticated` con `user_id = (select auth.uid())`). Contraseña ≥8 con minúscula, mayúscula, dígito y símbolo (`validatePassword`/`PASSWORD_ERROR` en `lib/auth-validation.ts`, misma regla que Supabase). `createAuthActionClient()` (`lib/supabase/server.ts`, `server-only`): clave secreta + cabecera `sb-forwarded-for` (IP del jugador) solo para `auth.*` en `signUp`/`signIn`; salta RLS, nunca para datos; `over_request_rate_limit` → "Demasiados intentos…". Panel Supabase: rate limit sign-ups/sign-ins 10/5 min, IP Address Forwarding activo; leaked password protection no disponible en Free. Headers `X-Content-Type-Options`, `X-Frame-Options: DENY` y `Referrer-Policy` en `next.config.ts` (CSP/HSTS: spec futura). Checklist en `references/security/security-checklist.md`.
- Producción: Claude solo tiene acceso MCP a dev (`.mcp.json`); prod (Supabase + Netlify) se migra a mano con `references/deploy/prod-runbook.md`: el script único `references/deploy/prod-setup.sql` (migraciones 0001-0012 consolidadas) se pega en el SQL Editor de prod y se verifica con `references/deploy/verify-prod.sql`. Migraciones nuevas: pegar su SQL en prod a mano. Nunca claves/tokens de prod en el repo ni en Claude.
- `references/` (solo lectura): `started-games/` fuentes originales, `source-assets/` sprites, `templates/` maqueta UI.

## Shared code

Reutilizar antes de crear código nuevo:

- `lib/canvas-cache.ts`: `createLayerCache()` (capa estática offscreen, se repinta solo si cambia la clave) y `createSpriteCache()` (sprites con glow pre-renderizados). Usar en vez de `shadowBlur` por objeto cada frame; limpiar en `setSkin`/`destroy` (SPEC 14).
- `lib/game-engine.ts`: contrato común (`GameStatus`, `HudItem`, `GameSnapshot`, `GameCallbacks`, `GameEngine`, `GameOption`, `TouchControls`).
- `components/touch-controls.tsx`: mando táctil genérico, configurado por `touchControls` en el registro. Todo motor nuevo lo cumple vía adaptador.
- `lib/game-registry.ts`: único punto de alta de juegos (`GAME_REGISTRY`, `getGameDefinition`); UI genérica, sin ramas por juego.
- `components/game-player.tsx` + `components/game-canvas.tsx`: reproductor y canvas compartidos por todos los juegos.
- `components/leaderboard.tsx`, `hall-of-fame.tsx`, `score-empty.tsx`, `data-error.tsx`, `game-card.tsx`, `library.tsx`: UI de scores/listados genérica.
- `lib/games(.server).ts`, `lib/scores(.server).ts`: acceso a datos `games`/`scores` (client vs server).
- `lib/supabase/{client,server,admin}.ts` + `database.types.ts`: únicos clientes Supabase (`admin` solo servidor); regenerar tipos tras cada migración.
- `lib/auth.tsx`: estado/sesión de jugador (`useAuth()` → `{ user: {id, name}, loading, signOut }`; `name` = username). `lib/auth-validation.ts`: reglas de usuario/email/contraseña compartidas por formularios y Server Actions.
- Cada `lib/<juego>/utils.ts`/`constants.ts`: helpers y dimensiones propios del juego; no duplicar entre juegos, promover a `lib/` si se repite.
- Lista de juegos existentes: `references/implemented-games.md` (actualizar al añadir uno).

## Skills

- `/spec` y `/spec-impl`: flujo Spec Driven (config en `specs/.spec-config.yml`, `AutoCreateBranch: true` crea rama `spec-NN-slug`).
- `/spec-impl-game` (propia, `.claude/skills/spec-impl-game/SKILL.md`, `disable-model-invocation`): implementa la spec de un juego leyendo y siguiendo `/spec-impl` (fuente única; busca también en `specs/game-jam/*/`) y, al terminar, lanza en secuencia `skin-designer`, luego `mobile-porter` y por último `game-performance-booster` sobre ese juego (nunca en paralelo; exige dev server activo).
- `/frontend-design`: usar siempre para diseñar interfaces de usuario.
- `/add-game` (propia, `.claude/skills/add-game/`: `SKILL.md`, `template.md`, `checklist.md`): genera la spec para añadir un juego real (motor TS, fila en `games`, leaderboard en `scores`) desde `references/started-games/` o nuevo, siguiendo SPEC 05 y 06; luego se implementa con `/spec-impl`. Admite `cat` ARCADE/PUZZLE/SHOOTER/VERSUS/RACING/FIGHTING/PLATFORMER/MAZE/RHYTHM/SPORTS/STRATEGY; el `color` no se elige: se deriva de la categoría con `CATEGORY_COLOR` (SPEC 15: ARCADE green, PUZZLE cyan, SHOOTER magenta, VERSUS yellow, RACING orange, PLATFORMER violet, FIGHTING red, MAZE blue, SPORTS lime, RHYTHM pink, STRATEGY silver), sin paso de ampliación de CHECK/`lib/games.ts`/CSS (BD, tipos y CSS ya admiten las 11). Con `disable-model-invocation` (no se invoca ni se precarga; `game-jam` lee sus archivos con Read); su "Modo game-jam" (no interactivo) lo aplica `game-jam` o se activa con `args` que empiezan por `game-jam:`.

## Tooling de Claude

- `/telegram-send <mensaje>` (propia, `.claude/skills/telegram-send/`: `SKILL.md`, `send.mjs`; invocable, uso solo explícito o por agentes): envía texto a Telegram (POST `sendMessage` de la Bot API). Lee `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` del bloque `env` de `.claude/settings.local.json` (ignorado por git; nunca en `settings.json`); requiere reiniciar Claude Code tras cambiarlas. En rutinas cloud (`/schedule`) ese archivo no existe: definirlas como variables del entorno cloud (claude.ai/code → Environments) y permitir red a `api.telegram.org`. Los subagentes `security-auditor`, `game-jam` y `game-planner` avisan por Telegram al terminar con el skill precargado (`skills: [telegram-send]`, necesitan `Bash`); si falla, lo indican sin reintentar.

- Hook `PostToolUse` (`.claude/settings.json` → `.claude/hooks/format-lint.mjs`): tras Write/Edit/MultiEdit ejecuta Prettier y ESLint `--fix`; ignora `references/`, `.claude/`, `.agents/`, `.next/`, `node_modules/`. Si falla, corregir antes de seguir.
- MCP (`.mcp.json`): Supabase (docs, database, migraciones, tipos). Playwright MCP para validar UI; screenshots en `.playwright-screenshots/` (gitignored).
- Subagente `game-planner` (`.claude/agents/game-planner.md`, `memory: project`): decide qué juego encaja; usar antes de `/add-game`. Memoria en `.claude/agent-memory/game-planner/` (`MEMORY.md`, `suggestions.md`); vuelca sugerencias en `references/game-suggestions-todo.md` (excepción: única escritura del agente en `references/`).
- Subagente `game-jam` (`.claude/agents/game-jam.md`): dado un tema, diseña un juego original y escribe ≥2 specs (motor, plataforma, extra opcional) en `specs/game-jam/<game-id>/`, formato SPEC 07-09. Lee con Read `.claude/skills/add-game/` (`disable-model-invocation`, sin `skills:`) y genera con él el spec core en modo game-jam. Solo escribe specs; se implementan después con `/spec-impl`.
- Subagente `skin-designer` (`.claude/agents/skin-designer.md`): aplica ≥3 skins (`classic` default, `retro`, `neon`, legibles en modo oscuro) solo al juego que se le indique, siguiendo el patrón de Tetris (`lib/<juego>/skins.ts`, opción `skin` `live` en el registro, `setSkin` en el motor). Un juego por invocación; verifica con Playwright. Estado por juego en `references/games-with-themes.md` (excepción: única escritura del agente en `references/`).
- Subagente `mobile-porter` (`.claude/agents/mobile-porter.md`): porta/revisa un solo juego para móvil siguiendo SPEC 12 (`touchControls` del registro, CSS móvil acotado a `pointer: coarse`/≤520px, sin tocar `touch-controls.tsx`/`game-player.tsx`); verifica con Playwright táctil 390×844 + escritorio. Estado por juego en `references/games-mobile-status.md` (excepción: única escritura del agente en `references/`).
- Subagente `game-performance-booster` (`.claude/agents/game-performance-booster.md`): revisa/corrige el performance de un solo juego (id por parámetro) siguiendo la SPEC 14: `shadowBlur` por objeto y fondos estáticos redibujados → capa estática y sprites con glow cacheados (`lib/canvas-cache.ts`), invalidados en `setSkin`/`destroy`; objetivo ≥58 FPS con CPU ×6 medido con `npm run perf`; visual idéntico. Un juego por invocación; verifica con Playwright. Estado por juego en `references/game-performance.md` (excepción: única escritura del agente en `references/`).
- Subagente `security-auditor` (`.claude/agents/security-auditor.md`): audita seguridad de BD (RLS, policies, `SECURITY DEFINER`, `get_advisors`, logs de Auth) y app (secretos fuera del bundle, headers, `proxy.ts`, validación de contraseña) contra SPEC 16/17 y `references/security/security-checklist.md`. **Solo lectura** (sin `apply_migration`; `execute_sql` solo `SELECT` o `begin…rollback`): propone SQL/código sin aplicarlo y sugiere `/spec`. Estado en `references/security/security-audit.md` (excepción: única escritura del agente en `references/`). Úsalo tras cada migración o spec que toque auth/datos. Regla de uso en `.claude/rules/security-auditor.md` (carga por `paths:`; una auditoría al final de la rama solo si tocó esos archivos).
- Context7 (`ctx7`): al generar código que use una librería/framework/SDK/API externa (Next.js, React, Supabase, Tailwind, Resend, Playwright…), consultar antes la doc actual con `npx ctx7@latest library <nombre> "<consulta>"` y luego `npx ctx7@latest docs <libraryId> "<consulta>"`. Solo cuando haga falta (API dependiente de versión/librería); no para lógica propia ni conceptos generales. Para Next.js, además `node_modules/next/dist/docs/`.
- Mantener README.md sincronizado cuando cambie este archivo.
