---
name: add-game
description: Genera la spec para añadir un juego real jugable a Arcade Vault (motor TS en canvas, fila en la tabla games, leaderboard en scores), portado desde references/started-games o diseñado desde cero. Se implementa después con /spec-impl.
disable-model-invocation: true
argument-hint: <carpeta de references/started-games o descripción del juego>
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(git status:*)
---

> Depende del skill `/spec` (`.claude/skills/spec/`): su `SKILL.md` y `template.md` se leen siempre antes de redactar y marcan el formato de la spec.

# /add-game — Diseñador de specs para juegos nuevos

## Contexto de sesión

Fecha de hoy (úsala en la cabecera de la spec, no la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No existe references/started-games/"`

Migraciones existentes:
!`ls supabase/migrations/ 2>/dev/null || echo "No existe supabase/migrations/"`

Registro genérico de juegos (si dice NO EXISTE, la spec debe incluir su paso):
!`ls lib/game-registry.ts 2>/dev/null || echo "NO EXISTE lib/game-registry.ts"`

Carpetas de motores ya portados:
!`ls lib/ 2>/dev/null || echo "No existe lib/"`

---

Este skill **no escribe código**. Produce `specs/NN-<slug>.md` (Estado `Borrador`) con el patrón que establecieron SPEC 05 (Asteroids) y SPEC 06 (tabla `games` + `scores`). La implementación se hace después con `/spec-impl`.

Responde en español, igual que las specs del repo.

## Fase 1 — Contexto

Lee, en este orden:

1. `CLAUDE.md` y `AGENTS.md`.
2. `specs/05-asteroids.md` y `specs/06-leaderboard-y-juegos.md` (patrón y convenciones de redacción).
3. **Skill `/spec` (obligatorio, antes de redactar):** `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md`. Son la referencia de formato y método para crear specs en este repo: filosofía, fases, cabecera, estados válidos, secciones, anti-patrones de criterios y reglas globales del documento. Si no existen en `.claude/skills/spec/`, busca en `.agents/skills/spec/`; si tampoco, avisa al usuario y detente.
4. `checklist.md` y `template.md` de este skill (mismo directorio). El `template.md` de `/add-game` **complementa** al de `/spec`: añade el contenido específico de un juego, nunca lo sustituye.
5. Código vivo del patrón: `components/game-player.tsx`, `components/asteroids-canvas.tsx`, `lib/asteroids/types.ts`, `lib/scores.ts`, `lib/games.server.ts`, `supabase/migrations/0004_seed_asteroids.sql`.
6. Specs posteriores a la 06 que existan en `specs/` (pueden haber cambiado el patrón, p. ej. un registro genérico ya implementado). Si el código real contradice las specs 05/06, manda el código.

## Fase 2 — Origen del juego

`$ARGUMENTS` es: `$ARGUMENTS`

- **Coincide con una carpeta de `references/started-games/`** (nombre completo o parcial): lee su `CLAUDE.md`, `README.md`, `index.html`, `game.js` y demás `.js`/assets. Inventaría y anota para la spec:
  - Variables globales y listeners (`window`/`document`) que hay que encapsular.
  - IDs del DOM que el original busca (`getElementById`) y su sustituto (HUD y overlays pasan a React).
  - Overlays/menús propios (pausa, game over, ayuda, selector de nivel, skins, tema) → se eliminan o quedan fuera.
  - Uso de `localStorage`, sonido, imágenes/assets (rutas, carga).
  - Tamaño del canvas, teclas, bucle (`requestAnimationFrame`, `dt`), puntuación, vidas, nivel.
  - Líneas/archivos concretos de cada punto (`game.js:123`).
- **Es una descripción o está vacío**: juego nuevo desde cero. Pide mecánica, reglas y controles. Debe ser un juego original; no recrear un juego existente concreto (nombre, personajes, arte, niveles) aunque se renombre.
- **Carpeta no encontrada**: muestra las disponibles y pregunta.

Nunca modifiques `references/`.

## Fase 3 — Preguntas

Con `AskUserQuestion`, solo lo que no puedas deducir (máx. 4 por tanda; recomienda una opción por defecto):

- `id` (slug de URL), título, `cat` (`ARCADE|PUZZLE|SHOOTER|VERSUS`), `color` (`cyan|magenta|yellow|green`), textos `short` y `long`.
- Campos del HUD de plataforma: `score` siempre; el resto según el juego (vidas, nivel, líneas…).
- Extras del original: ¿se portan o quedan fuera? (menús, skins, sonido, selector de nivel, récords en `localStorage`).
- Teclas de pausa (por defecto `Esc` y `P`) y si hay controles táctiles (por defecto fuera, con aviso "REQUIERE TECLADO").
- Si el registro genérico no existe: confirmar que la spec incluya su extracción (recomendado).

No preguntes lo que ya dicta `checklist.md`.

## Fase 4 — Redacción

0. **Antes de crear el archivo**, relee lo leído en la Fase 1 del skill `/spec` (`SKILL.md` y `template.md`) y aplica su método: spec como contrato, secciones en su orden, cabecera en blockquote, estados con el mismo idioma que las specs existentes, objetivo en una sola frase, pasos commiteables y funcionales, criterios booleanos sin anti-patrones, decisiones con motivo, sin TODOs ni código largo. Si `/spec` y `/add-game` discrepan en formato, manda `/spec`; si discrepan en contenido técnico del juego, manda `checklist.md`.
1. Número `NN` = siguiente al mayor de `specs/`; slug `NN-<juego>.md`.
2. Genera la spec con la estructura de `.claude/skills/spec/template.md` rellenada con el contenido de `template.md` de este skill: cabecera (`Estado: Borrador`, `Depende de` SPEC 01, 05 y 06 más las que apliquen, fecha de hoy, objetivo en una frase), Por qué, Alcance (dentro/fuera), Modelo de datos, Plan, Criterios, Decisiones, Riesgos, "Qué no está".
3. El plan sigue los pasos estándar de `template.md` (incluye el paso del registro genérico solo si no existe), adaptado al juego: archivos reales de `lib/<slug>/`, valores y fórmulas concretas del original con referencias a línea.
4. Criterios de aceptación: los genéricos de `checklist.md` + los específicos del juego (puntuación, reglas, niveles), todos booleanos y verificables.
5. Muestra la spec sección a sección, corrige con el usuario y guarda con `Write` al confirmar.
6. Termina indicando: revisar la spec, pasar su Estado a `Aprobado` a mano y ejecutar `/spec-impl NN-<juego>`. Recuerda que al actualizar `CLAUDE.md` (lista de specs) se actualiza también `README.md`.

## Reglas

- No escribas código de la aplicación, migraciones ni CSS: solo la spec.
- No salgas de alcance: lo extra va a "Fuera de alcance".
- Sin TODOs en la spec: decide o regístralo como decisión pendiente con motivo.
- Diseño visual (portada, estados): la spec indica aplicar `/frontend-design`.
