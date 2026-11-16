import { BALL_SPEED, LEVEL_SPEED_STEP } from "./constants";

// Velocidad de la bola del nivel (px/s): +8 % de la base por nivel.
export function ballSpeed(level: number): number {
  return BALL_SPEED * (1 + LEVEL_SPEED_STEP * (level - 1));
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
