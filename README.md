## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

Skill propia del proyecto: `/add-game` (`.claude/skills/add-game/`). Genera la spec para añadir un juego real con leaderboard (desde `references/started-games/` o nuevo), siguiendo SPEC 05 y 06; se implementa con `/spec-impl`. Admite `cat` ARCADE/PUZZLE/SHOOTER/VERSUS/RACING/FIGHTING/PLATFORMER/MAZE/RHYTHM/SPORTS/STRATEGY y `color` cyan/magenta/yellow/green/orange/violet/red; los no soportados aún por BD/código (solo los 4+4 originales) añaden a la spec un paso de ampliación de CHECK, `lib/games.ts` y CSS. Sin `disable-model-invocation` para poder precargarse en el subagente `game-jam` (el modelo principal también puede invocarlo); su "Modo game-jam" (no interactivo) lo aplica `game-jam` o se activa con `args` que empiezan por `game-jam:`.

## Juegos y rutas

Juegos jugables: Asteroids, Tetris, Arkanoid y Snake, cada uno con motor TS en `lib/<juego>/`, registrado en `lib/game-registry.ts` y con leaderboard en Supabase.

Rutas: `/` home · `/juegos` biblioteca · `/juegos/[id]` detalle · `/juegos/[id]/jugar` (el menú de fin enlaza a `/salon-de-la-fama?juego=<id>`; el estado del reproductor se reinicia al salir) · `/salon-de-la-fama` (`?juego=<id>` elige la pestaña inicial) · `/login` · `/about` (contacto con Resend).

Lista detallada de juegos (desde la BD): `references/implemented-games.md`.

## Código compartido

Contrato de motores `lib/game-engine.ts`, registro `lib/game-registry.ts`, reproductor `components/game-player.tsx` / `game-canvas.tsx` (las opciones `live`, p. ej. skin, van en el HUD; las `restart`, en el overlay de pausa), UI de scores (`leaderboard`, `hall-of-fame`), acceso a datos `lib/games*`/`lib/scores*` y clientes `lib/supabase/`. Reutilizar antes de crear código nuevo.

## Tooling de Claude

- Hook `PostToolUse` (`.claude/hooks/format-lint.mjs`): Prettier + ESLint `--fix` tras cada Write/Edit.
- MCP (`.mcp.json`): Supabase. Playwright MCP para validar UI (screenshots en `.playwright-screenshots/`).
- Subagente `game-planner` (`.claude/agents/game-planner.md`): planifica qué juego encaja, con memoria persistente en `.claude/agent-memory/game-planner/` y To-Do en `references/game-suggestions-todo.md`. Usar antes de `/add-game`.
- Subagente `game-jam` (`.claude/agents/game-jam.md`): dado un tema, diseña un juego original y escribe ≥2 specs (motor, plataforma, extra opcional) en `specs/game-jam/<game-id>/`, formato SPEC 07-09. Precarga el skill `/add-game` (`skills:` en el frontmatter) y genera con él el spec core en modo game-jam. Se implementan después con `/spec-impl`.
- Subagente `skin-designer` (`.claude/agents/skin-designer.md`): aplica ≥3 skins (`classic` default, `retro`, `neon`, legibles en modo oscuro) solo al juego que se le indique, siguiendo el patrón de Tetris (SPEC 07). Estado por juego en `references/games-with-themes.md`.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test runner configured.

### Probar en el móvil por LAN

Para abrir `npm run dev` desde un móvil en la misma red, Next bloquea por defecto los orígenes que no son `localhost`. Permite la IP de tu equipo con `ALLOWED_DEV_ORIGINS` (lista separada por comas; vacío por defecto, sin cambios de comportamiento):

```bash
# PowerShell
$env:ALLOWED_DEV_ORIGINS = "192.168.1.50"; npm run dev
# bash
ALLOWED_DEV_ORIGINS=192.168.1.50 npm run dev
```

Luego abre `http://192.168.1.50:3000` en el móvil (la IP sale de `ipconfig`). Reinicia el servidor si cambias la variable.

## Specs (`specs/`)

| Spec                            | Contenido                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `01-mvp-pantallas.md`           | MVP visual: 5 pantallas con datos mock                                                     |
| `02-homepage.md`                | Home en `/`, Biblioteca movida a `/juegos`, nav completa                                   |
| `03-about-contacto.md`          | `/about` + formulario de contacto (Resend, Server Action)                                  |
| `04-supabase-cimientos.md`      | Supabase: clientes, migraciones, tipos generados                                           |
| `05-asteroids.md`               | Asteroids: primer juego real jugable (motor TS en `lib/asteroids/`)                        |
| `06-leaderboard-y-juegos.md`    | Tablas `games` y `scores` en Supabase; leaderboard real (solo Asteroids)                   |
| `07-tetris.md`                  | Tetris (motor TS en `lib/tetris/`) y registro genérico de juegos                           |
| `08-arkanoid.md`                | Arkanoid (motor TS en `lib/arkanoid/`) con sonido y 5 niveles                              |
| `09-snake.md`                   | Snake (motor TS en `lib/snake/`) con sprites de frutas y niveles                           |
| `10-hud-skins-integrados.md`    | Selector de skin (opciones `live`) integrado en el HUD del reproductor                     |
| `11-fin-leaderboard-y-reset.md` | Botón del menú de fin al Salón de la fama (`?juego=<id>`) y reset del reproductor al salir |

### Buenas prácticas

- Una spec por cambio, numerada `NN-nombre.md`, en `specs/`.
- Cabecera fija: **Estado**, **Depende de**, **Fecha**, **Objetivo**.
- Secciones: Por qué existe, Alcance (dentro / fuera), Plan de implementación, Criterios de aceptación, Decisiones, Riesgos.
- Alcance pequeño; lo demás va explícito en "Fuera de alcance" para specs futuras.
- Crear con `/spec`, implementar con `/spec-impl`, un commit por paso (`NN-nombre: Paso N`).
- Marcar **Estado: Implementado** al terminar; actualizar la spec si cambian decisiones.
