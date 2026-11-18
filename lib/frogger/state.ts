import {
  FIRST_EXTRA_LIFE,
  HOME_COLS,
  LIVES,
  MAX_LIVES,
  NEXT_EXTRA_LIFE_EVERY,
  POINTS_ALL_HOMES,
  POINTS_HOME,
  POINTS_NEW_ROW,
  POINTS_PER_SECOND,
  TIME_LIMIT,
} from "./constants";
import {
  createFrog,
  killFrog,
  resetFrog,
  tryJump,
  updateFrog,
  type Frog,
  type FrogEvent,
} from "./frog";
import { advanceLane, createLanes, type LaneState } from "./lanes";
import type { Direction, FroggerSnapshot } from "./types";

// Estado y reglas de la partida. Sin canvas ni DOM: lo mueve el motor.
export interface GameState {
  frog: Frog;
  lanes: LaneState[];
  filled: boolean[]; // una por hueco de HOME_COLS
  score: number;
  lives: number;
  level: number;
  timeLeft: number; // s restantes de la vida actual
  nextExtraLife: number; // umbral de puntos de la próxima vida extra
  over: boolean;
}

export function createState(): GameState {
  return {
    frog: createFrog(),
    lanes: createLanes(),
    filled: HOME_COLS.map(() => false),
    score: 0,
    lives: LIVES,
    level: 1,
    timeLeft: TIME_LIMIT,
    nextExtraLife: FIRST_EXTRA_LIFE,
    over: false,
  };
}

export function homesFilled(s: GameState): number {
  return s.filled.filter(Boolean).length;
}

export function snapshotOf(s: GameState, paused: boolean): FroggerSnapshot {
  return {
    score: s.score,
    lives: s.lives,
    level: s.level,
    homes: homesFilled(s),
    status: s.over ? "gameover" : paused ? "paused" : "playing",
  };
}

export function jump(s: GameState, dir: Direction): boolean {
  if (s.over) return false;
  return tryJump(s.frog, dir);
}

// Fin voluntario: la partida termina con la puntuación actual.
export function endGame(s: GameState) {
  s.over = true;
}

function addScore(s: GameState, points: number) {
  s.score += points;
  // Vida extra a 10.000 y luego cada 20.000 (máximo 5 vidas).
  while (s.score >= s.nextExtraLife) {
    if (s.lives > 0) s.lives = Math.min(MAX_LIVES, s.lives + 1);
    s.nextExtraLife += NEXT_EXTRA_LIFE_EVERY; // 10.000, 30.000, 50.000…
  }
}

function respawn(s: GameState) {
  resetFrog(s.frog);
  s.timeLeft = TIME_LIMIT;
}

function handle(s: GameState, ev: FrogEvent) {
  switch (ev.type) {
    case "newRow":
      addScore(s, POINTS_NEW_ROW);
      break;
    case "home": {
      s.filled[ev.index] = true;
      addScore(s, POINTS_HOME + POINTS_PER_SECOND * Math.floor(s.timeLeft));
      if (homesFilled(s) === HOME_COLS.length) {
        addScore(s, POINTS_ALL_HOMES);
        s.level += 1;
        s.filled.fill(false);
      }
      respawn(s);
      break;
    }
    case "died":
      s.lives = Math.max(0, s.lives - 1);
      if (s.lives === 0) s.over = true;
      break;
    case "respawn":
      respawn(s);
      break;
  }
}

// Avanza la partida `dt` segundos. Los eventos de la rana se aplican en orden.
export function stepState(s: GameState, dt: number) {
  if (s.over) return;
  for (const lane of s.lanes) advanceLane(lane, s.level, dt);

  const events = [...updateFrog(s.frog, s.lanes, s.filled, s.level, dt)];

  if (!s.frog.dead && !events.some((e) => e.type === "home")) {
    s.timeLeft = Math.max(0, s.timeLeft - dt);
    if (s.timeLeft === 0) events.push(...killFrog(s.frog, "time"));
  }

  for (const ev of events) {
    if (s.over) break;
    handle(s, ev);
  }
}
