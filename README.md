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

Skill propia del proyecto: `/add-game` (`.claude/skills/add-game/`). Genera la spec para añadir un juego real con leaderboard (desde `references/started-games/` o nuevo), siguiendo SPEC 05 y 06; se implementa con `/spec-impl`. Admite `cat` ARCADE/PUZZLE/SHOOTER/VERSUS/RACING/FIGHTING/PLATFORMER/MAZE/RHYTHM/SPORTS/STRATEGY; el `color` no se elige: se deriva de la categoría con `CATEGORY_COLOR` (SPEC 15: ARCADE green, PUZZLE cyan, SHOOTER magenta, VERSUS yellow, RACING orange, PLATFORMER violet, FIGHTING red, MAZE blue, SPORTS lime, RHYTHM pink, STRATEGY silver), sin paso de ampliación de CHECK/`lib/games.ts`/CSS (BD, tipos y CSS ya admiten las 11). Con `disable-model-invocation` (no se invoca ni se precarga; `game-jam` lee sus archivos con Read); su "Modo game-jam" (no interactivo) lo aplica `game-jam` o se activa con `args` que empiezan por `game-jam:`.

Skill propia `/spec-impl-game` (`.claude/skills/spec-impl-game/`): implementa la spec de un juego siguiendo `/spec-impl` y después lanza, uno tras otro, los subagentes `skin-designer`, `mobile-porter` y `game-performance-booster`.

## Juegos y rutas

Juegos jugables: Asteroids, Tetris, Arkanoid, Snake y Frogger, cada uno con motor TS en `lib/<juego>/`, registrado en `lib/game-registry.ts` y con leaderboard en Supabase.

Rutas: `/` home · `/juegos` biblioteca · `/juegos/[id]` detalle · `/juegos/[id]/jugar` (el menú de fin enlaza a `/salon-de-la-fama?juego=<id>`; el estado del reproductor se reinicia al salir) · `/salon-de-la-fama` (`?juego=<id>` elige la pestaña inicial) · `/login` (SPEC 16: email o usuario + contraseña, Google/GitHub, recuperar contraseña, invitado) · `/perfil` (avatar, cambio de username, cambio de contraseña y eliminar cuenta (SPEC 19); el avatar del nav abre el menú Perfil / Cerrar sesión) · `/auth/callback` · `/auth/reset-password` · `/about` (contacto con Resend).

Autenticación (SPEC 16): Supabase Auth con confirmación de email, perfil `profiles` (username único, editable en `/perfil`; avatar con la foto de la red social o iniciales) y `scores.user_id` (SPEC 18: `not null`; solo los jugadores con sesión guardan puntuación, el invitado juega pero no guarda; si se borra el usuario, sus puntuaciones se borran en cascada, migración `0013`). `proxy.ts` refresca la sesión y (SPEC 17) redirige `/perfil` a `/login` sin sesión (`PROTECTED_ROUTES`). Env nueva: `SUPABASE_SECRET_KEY` (solo servidor; en `.env.local`, nunca `NEXT_PUBLIC_`) y, desde SPEC 20, `NEXT_PUBLIC_SITE_URL` (origen público sin `/` final; fija el enlace del email de confirmación; obligatoria en producción, en dev `http://localhost:3000`). La IP del jugador para el rate limit se toma de `x-vercel-forwarded-for`/`x-real-ip`/última entrada de `x-forwarded-for`. En el panel de Supabase: "Confirm email" activado, proveedores Google/GitHub y Redirect URLs `http://localhost:3000/auth/callback` y `/auth/reset-password`.

Lista detallada de juegos (desde la BD): `references/implemented-games.md`.

## Código compartido

Cachés de canvas `lib/canvas-cache.ts` (capa estática y sprites con glow, SPEC 14). Contrato de motores `lib/game-engine.ts`, registro `lib/game-registry.ts`, reproductor `components/game-player.tsx` / `game-canvas.tsx` (las opciones `live`, p. ej. skin, van en el HUD; las `restart`, en el overlay de pausa), mando táctil `components/touch-controls.tsx` (aspecto Gamepad MK-II, SPEC 13; configurado por `touchControls` en el registro; emite teclas virtuales, solo con `pointer: coarse`; fijo abajo en móvil vertical), UI de scores (`leaderboard`, `hall-of-fame`), acceso a datos `lib/games*`/`lib/scores*` y clientes `lib/supabase/`. Reutilizar antes de crear código nuevo.

## Tooling de Claude

- Hook `PostToolUse` (`.claude/hooks/format-lint.mjs`): Prettier + ESLint `--fix` tras cada Write/Edit.
- Producción: Claude solo accede a dev por MCP; prod (Supabase + Netlify) se migra a mano con `references/deploy/prod-runbook.md` (script único `prod-setup.sql` en el SQL Editor de prod) y se verifica con `references/deploy/verify-prod.sql`.
- MCP (`.mcp.json`): Supabase. Playwright MCP para validar UI (screenshots en `.playwright-screenshots/`).
- `/telegram-send <mensaje>` (`.claude/skills/telegram-send/`): envía texto a Telegram (Bot API `sendMessage`). Requiere `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en el bloque `env` de `.claude/settings.local.json` (ignorado por git); reiniciar Claude Code tras definirlas. En rutinas cloud (`/schedule`) ese archivo no existe: definirlas como variables del entorno cloud (claude.ai/code → Environments) y permitir red a `api.telegram.org`. Los subagentes `security-auditor`, `game-jam`, `game-planner` y `game-expander` avisan por Telegram al terminar con el skill precargado (`skills: [telegram-send]`); si falla, lo indican sin reintentar.
- Subagente `game-planner` (`.claude/agents/game-planner.md`): planifica qué juego encaja, con memoria persistente en `.claude/agent-memory/game-planner/` y To-Do en `references/game-suggestions-todo.md`. Usar antes de `/add-game`.
- Subagente `game-expander` (`.claude/agents/game-expander.md`): propone 2-3 ideas de expansión por cada juego ya implementado solicitado (sin ids, todos); nunca propone juegos nuevos ni ideas para juegos no implementados. To-Do persistente en `references/game-expansions-todo.md`; sugiere `/spec` para implementar una idea.
- Subagente `game-jam` (`.claude/agents/game-jam.md`): dado un tema, diseña un juego original y escribe ≥2 specs (motor, plataforma, extra opcional) en `specs/game-jam/<game-id>/`, formato SPEC 07-09. Lee con Read `.claude/skills/add-game/` (`disable-model-invocation`, sin `skills:`) y genera con él el spec core en modo game-jam. Se implementan después con `/spec-impl`.
- Subagente `skin-designer` (`.claude/agents/skin-designer.md`): aplica ≥3 skins (`classic` default, `retro`, `neon`, legibles en modo oscuro) solo al juego que se le indique, siguiendo el patrón de Tetris (SPEC 07). Estado por juego en `references/games-with-themes.md`.
- Subagente `mobile-porter` (`.claude/agents/mobile-porter.md`): porta/revisa un juego para móvil siguiendo la SPEC 12 (`touchControls` en el registro, CSS móvil acotado, verificación táctil 390×844 con Playwright). Estado por juego en `references/games-mobile-status.md`.
- Subagente `game-performance-booster` (`.claude/agents/game-performance-booster.md`): revisa/corrige el performance de un juego (id por parámetro) con el patrón de la SPEC 14 (capa estática y sprites con glow cacheados, ≥58 FPS con CPU ×6 medido con `npm run perf`). Estado por juego en `references/game-performance.md`.
- Subagente `security-auditor` (`.claude/agents/security-auditor.md`): audita la seguridad de la BD Supabase (RLS, policies, funciones `SECURITY DEFINER`, advisors, logs de Auth) y de la app (secretos, headers, `proxy.ts`, validación de contraseña) según SPEC 16/17. Solo lectura: propone correcciones sin aplicarlas. Estado en `references/security/security-audit.md`. Regla de uso en `.claude/rules/security-auditor.md` (se carga al tocar migraciones, auth, `proxy.ts`, `next.config.ts`…).

- Context7 (`ctx7`): al generar código con librerías/frameworks/SDK externos, consultar antes la doc actual (`npx ctx7@latest library <nombre> "<consulta>"` → `docs <libraryId> "<consulta>"`). Solo cuando haga falta; no para lógica propia.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm run check:secret-client` — falla si `createAuthActionClient` (clave secreta) se usa con `.from(`/`.rpc(` en `app/` o `lib/` (SPEC 20)
- `npm run perf` — mide FPS y JS/frame de los 5 juegos × skins con CPU ×1/×6 (Playwright, Chromium con ventana; requiere `npm run dev` activo; `PERF_URL`, `PERF_GAMES=a,b`, `PERF_HEADLESS=1`); sale con código 1 si algún caso con ×6 queda <58 FPS (SPEC 14)
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

| Spec                                           | Contenido                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `01-mvp-pantallas.md`                          | MVP visual: 5 pantallas con datos mock                                                                                          |
| `02-homepage.md`                               | Home en `/`, Biblioteca movida a `/juegos`, nav completa                                                                        |
| `03-about-contacto.md`                         | `/about` + formulario de contacto (Resend, Server Action)                                                                       |
| `04-supabase-cimientos.md`                     | Supabase: clientes, migraciones, tipos generados                                                                                |
| `05-asteroids.md`                              | Asteroids: primer juego real jugable (motor TS en `lib/asteroids/`)                                                             |
| `06-leaderboard-y-juegos.md`                   | Tablas `games` y `scores` en Supabase; leaderboard real (solo Asteroids)                                                        |
| `07-tetris.md`                                 | Tetris (motor TS en `lib/tetris/`) y registro genérico de juegos                                                                |
| `08-arkanoid.md`                               | Arkanoid (motor TS en `lib/arkanoid/`) con sonido y 5 niveles                                                                   |
| `09-snake.md`                                  | Snake (motor TS en `lib/snake/`) con sprites de frutas y niveles                                                                |
| `10-hud-skins-integrados.md`                   | Selector de skin (opciones `live`) integrado en el HUD del reproductor                                                          |
| `11-fin-leaderboard-y-reset.md`                | Botón del menú de fin al Salón de la fama (`?juego=<id>`) y reset del reproductor al salir                                      |
| `12-controles-tactiles.md`                     | Mando táctil bajo el canvas (`touchControls` por juego en el registro) y HUD compacto en móvil                                  |
| `13-gamepad-mk2.md`                            | Aspecto Gamepad MK-II del mando táctil (carcasa neón, cruz con hub, botones A/B), fijo abajo en móvil                           |
| `14-revision-performance.md`                   | Revisión de performance: ≥58 FPS con CPU ×6 en los 5 juegos (cachés de capa y sprites con glow), `npm run perf`                 |
| `15-colores-por-categoria.md`                  | Un color fijo por categoría (11↔11): migración `0009`, `CATEGORY_COLOR`, acentos CSS y agentes/skills alineados                 |
| `16-autenticacion.md`                          | Supabase Auth: registro con confirmación, login email/usuario, Google/GitHub, reset, `profiles` y `scores.user_id`              |
| `17-medidas-seguridad.md`                      | Seguridad básica: migración `0012`, contraseña fuerte, reenvío de IP en Auth, headers y `/perfil` protegido en `proxy.ts`       |
| `18-solo-logueados-puntuan.md`                 | Solo con sesión se guarda puntuación: migración `0013`, `user_id not null`, cascade, el invitado juega sin guardar              |
| `19-perfil-contrasena-y-borrar-cuenta.md`      | Cambiar contraseña (con la actual) y eliminar cuenta desde `/perfil`, sin migración                                             |
| `20-endurecer-auth-ip-origen-pkce.md`          | Endurece auth: IP de cabecera fiable, origen fijo con `NEXT_PUBLIC_SITE_URL`, PKCE por código, control de clave secreta         |
| `21-color-categoria-en-ui.md`                  | Color de categoría en la UI: etiquetas, hover de tarjeta, JUGAR AHORA, actividad y chips del filtro (`--accent`); sin migración |
| `game-jam/frogger/01-frogger-core.md`          | Frogger: motor TS en `lib/frogger/` (carretera, río, casas, vidas, tiempo)                                                      |
| `game-jam/frogger/02-frogger-platform.md`      | Frogger en la plataforma: registro, migración `0008`, portada, pausa (botón + `P`/`Esc`) y guardado                             |
| `game-jam/frogger/03-frogger-hazards-audio.md` | Frogger: peligros extra y audio (pendiente de implementar)                                                                      |

### Buenas prácticas

- Una spec por cambio, numerada `NN-nombre.md`, en `specs/`.
- Cabecera fija: **Estado**, **Depende de**, **Fecha**, **Objetivo**.
- Secciones: Por qué existe, Alcance (dentro / fuera), Plan de implementación, Criterios de aceptación, Decisiones, Riesgos.
- Alcance pequeño; lo demás va explícito en "Fuera de alcance" para specs futuras.
- Crear con `/spec`, implementar con `/spec-impl`, un commit por paso (`NN-nombre: Paso N`).
- Marcar **Estado: Implementado** al terminar; actualizar la spec si cambian decisiones.
