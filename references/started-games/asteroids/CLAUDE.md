# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in plain HTML5 Canvas + vanilla JS. No dependencies, no bundler, no tests, no linter. README is in Spanish.

## Running

Open `index.html` directly in a browser, or serve it: `npx serve .` (http://localhost:3000).

## Architecture

All logic lives in `game.js` (~420 lines), loaded by `index.html`. Canvas is fixed at 800x600 (`W`, `H`); the world is toroidal (entities wrap at edges).

- Entity classes: `Bullet`, `Asteroid`, `Ship`, `Particle`. Each has its own update/draw.
- Asteroid size is 1/2/3 (small/medium/large); `RADII`, `SPEEDS`, `POINTS` are arrays indexed by size (index 0 unused). Large splits into medium, medium into small.
- Global game state (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`) plus a `state` machine: `'playing' | 'dead' | 'gameover'` (`deadTimer` handles respawn delay).
- Main loop: `loop(ts)` → `update(dt)` + `draw()` using delta time in seconds. `initGame()` resets, `nextLevel()` spawns the next wave.
- Input is tracked via a key map with a `pressed(code)` helper (one-shot presses).
