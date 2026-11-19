---
name: spec-impl-game
description: Implementa una spec aprobada de un juego igual que /spec-impl y, al terminar, lanza en secuencia (nunca en paralelo) los subagentes skin-designer, después mobile-porter y por último game-performance-booster sobre ese juego.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(curl:*)
---

# /spec-impl-game — /spec-impl + skin-designer + mobile-porter + game-performance-booster

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Game-jam specs:
!`ls specs/game-jam/* 2>/dev/null || echo "No game-jam specs"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

El argumento recibido es: `$ARGUMENTS`

### Fases 1-4 — Implementación (idéntica a /spec-impl)

`/spec-impl` tiene `disable-model-invocation`, así que no se puede invocar con la herramienta Skill. En su lugar:

1. Lee `.claude/skills/spec-impl/SKILL.md` (fuente única de verdad).
2. Sigue sus Fases 1-4 **al pie de la letra** usando `$ARGUMENTS` como argumento: identificar spec, validar Estado "Aprobado", rama `spec-NN-slug`, resumen, implementación paso a paso con pausas, sin commits automáticos.
3. Única extensión: en su Fase 1, busca la spec también en `specs/game-jam/*/`.
4. Si `/spec-impl` se detiene (spec no aprobada, cambios pendientes, ambigüedad, falta de confirmación…), **detente tú también**. No lances agentes.

### Fase 5 — Identificar el juego

Cuando todos los pasos del plan estén implementados (mensaje final de `/spec-impl`):

- Deduce el `game-id` de la spec (slug de `games.id`, clave en `GAME_REGISTRY` de `lib/game-registry.ts`).
- Verifica que existe en el registro. Si no existe o es ambiguo, pregunta con AskUserQuestion. No infieras.

### Fase 6 — Pre-agentes

Los agentes verifican con Playwright (y `game-performance-booster` mide con `npm run perf`) y **no arrancan** el dev server. Comprueba que responde (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`). Si no, pide al usuario `! npm run dev` y espera.

### Fase 7 — skin-designer

Lanza `Agent` con `subagent_type: "skin-designer"`. Prompt: juego `<game-id>`, spec ya implementada en la rama activa, no commitear, no tocar otros juegos. Espera su resultado y resúmelo en pocas líneas.

### Fase 8 — mobile-porter

**Solo cuando la Fase 7 haya terminado** (llamada en un mensaje aparte; nunca en paralelo). Lanza `Agent` con `subagent_type: "mobile-porter"`, mismo patrón de prompt. Si `skin-designer` falló o reportó bloqueo, para y pregunta al usuario antes de seguir.

### Fase 9 — game-performance-booster

**Solo cuando la Fase 8 haya terminado** (llamada en un mensaje aparte; nunca en paralelo). Lanza `Agent` con `subagent_type: "game-performance-booster"`, mismo patrón de prompt (juego `<game-id>`, no commitear, no tocar otros juegos). Si `mobile-porter` falló o reportó bloqueo, para y pregunta al usuario antes de seguir.

### Cierre

Resumen conciso: spec, rama, archivos tocados por cada agente, filas actualizadas en `references/games-with-themes.md`, `references/games-mobile-status.md` y `references/game-performance.md`. Recuerda al usuario: verificar criterios de aceptación, pasar Estado → Implementado y hacer los commits él mismo (no commitear sin petición explícita).
