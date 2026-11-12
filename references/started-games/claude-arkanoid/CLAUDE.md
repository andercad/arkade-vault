# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Language

Always reply to the user in Spanish from Spain (español de España) in this project. Specs, commits and code comments are also in Spanish.

## Project

Arkanoid game in plain HTML, CSS and JavaScript. **Zero dependencies**, no build step, no package manager, no tests/lint. Open `index.html` directly in a browser to play. Verification is manual (play it, or poke `game` from the browser console).

README is outdated (still says "not implemented"); the game is implemented through SPEC 04.

## Structure

```
index.html            canvas#game (480x640) + scripts in order below
style.css
assets/spritesheet.js     global script (no modules): SPRITES, EXPLOSION_FRAMES, loadSpritesheet, drawFrame, drawSprite
assets/spritesheet-breakout.png
assets/sounds/ball-bounce.mp3, break-sound.mp3
levels.js             global `LEVELS`: 5 patterns, 6 rows x 10 cols, 'X' = brick, '.' = gap
game.js               all game logic (~500 lines)
specs/NN-slug.md      one spec per feature + specs/.spec-config.yml
.agents/skills/       spec, spec-impl (symlinked into .claude/skills/; locked in skills-lock.json)
```

Script load order in `index.html` matters: `assets/spritesheet.js` → `levels.js` → `game.js`. All are plain global scripts; new data files must be added before `game.js`.

## Code architecture (`game.js`)

- Constants at top (canvas, bricks, paddle, ball, particles, sounds, `LEVEL_COUNT`, `LEVEL_SPEED_STEP`, `HIGHSCORE_KEY`).
- Single `game` object holds all state. `game.state`: `'start' | 'playing' | 'paused' | 'levelcomplete' | 'gameover' | 'won'`.
- Flow: `handleAction()` (Space/click) dispatches by state; `startGame()` → `startLevel(1)`; `startLevel(n)` builds bricks, clears `explosions`/`particles`, centers paddle, sticks ball. `endGame('won' | 'gameover')` is the only exit point and saves the high score.
- `ballSpeed(level)` is the only source of ball speed (`BALL_SPEED * (1 + LEVEL_SPEED_STEP * (level - 1))`). Don't use `BALL_SPEED` directly.
- Main loop: `loop(now)` → `update(dt)` + `render()`; `dt` capped by `MAX_DT` (1/30 s). Units: px/s, origin top-left.
- Pause (`P`/`Esc`, only from `playing`) shows level selector; keys `1`–`5` or click jump to level via `startLevel(n)`, only in `paused`.
- High score persisted in localStorage (`arkanoid:v1:highScore`) with in-memory fallback.
- Audio: `playSound(audio)` clones the base `Audio` so sounds overlap; errors swallowed (autoplay).

## Assets

- Draw calls are no-ops until `loadSpritesheet` callback fires. Image path is hardcoded relative to the page: `assets/spritesheet-breakout.png`, so the HTML page must live at the repo root.
- Explosion: 4 frames per color, `EXPLOSION_DURATION` 150 ms. Particles (SPEC 02) are an extra layer on top.

## Workflow: spec-driven

**Every feature goes through a spec. Don't change game code outside `/spec-impl`.**

- `/spec <description>` — asks clarifying questions, writes `specs/NN-slug.md` (state `Draft`, template in `.agents/skills/spec/template.md`), seeds `specs/.spec-config.yml`. Writes no code.
- `/spec-impl NN-slug` — only runs if spec state means "Approved" (human flips it; never the agent). Creates/switches to branch `spec-NN-slug` (unless `AutoCreateBranch: false` in `specs/.spec-config.yml`), then implements **one plan step at a time**, pausing for diff review. Never commits automatically; no out-of-scope changes; spec ambiguities → stop and ask.
- Spec states: `Draft`, `In review`, `Approved`, `Implemented`, `Obsolete` (Spanish equivalents `Borrador`, `En revisión`, `Aprobado`, `Implementado`, `Obsoleto`; repo uses Spanish, e.g. `Aprobado`).

### Spec format (match existing specs)

Header blockquote: `Status`, `Depends on`, `Date`, `Objective` (one sentence). Then sections: Why this spec exists (optional), Scope (In / Out of scope), Data model, Implementation plan (numbered steps, each with a manual test), Acceptance criteria (`- [ ]` checklist, ticked as implemented), Decisions (Sí/No + reason), Risks (table), What is **not** in this spec. Spec language: Spanish.

### Spec history

| Spec | Content |
| --- | --- |
| 01-arkanoid-mvp | Playable MVP: paddle, ball, bricks, lives, score, start/pause screens, high score |
| 02-particulas-destruccion-bloques | Particles on brick destruction (on top of sprite explosion) |
| 03-sonidos | Bounce and break sounds |
| 04-cinco-niveles | 5 levels (`levels.js`), +8 % ball speed per level, `levelcomplete` state, pause level selector |

Later specs may lift exclusions of earlier ones (state this in "Why this spec exists"). Check "Out of scope" of existing specs before proposing work.

### Git conventions

- One branch per spec: `spec-NN-slug`.
- One commit per plan step, message `spce-NN-slug: Paso N` (existing history uses this spelling, including the `spce` typo; keep consistent unless the user says otherwise).
