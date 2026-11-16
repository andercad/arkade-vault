import {
  BASE_STEP_MS,
  COLS,
  FRUITS_PER_LEVEL,
  MIN_STEP_MS,
  ROWS,
  STEP_MS_PER_LEVEL,
} from "./constants";
import type { Cell, Direction } from "./types";

export function levelFor(fruits: number): number {
  return 1 + Math.floor(fruits / FRUITS_PER_LEVEL);
}

// Intervalo de paso en ms: nivel 1 → 140, nivel 8+ → 70.
export function stepInterval(level: number): number {
  return Math.max(MIN_STEP_MS, BASE_STEP_MS - (level - 1) * STEP_MS_PER_LEVEL);
}

export function opposite(d: Direction): Direction {
  switch (d) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

// Celda libre aleatoria (no ocupada por la serpiente), o null si el tablero está lleno.
export function randomFreeCell(occupied: readonly Cell[]): Cell | null {
  const taken = new Set(occupied.map((c) => c.row * COLS + c.col));
  const free: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!taken.has(row * COLS + col)) free.push({ col, row });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}
