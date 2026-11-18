import { MAX_SPEED_FACTOR, SPEED_PER_LEVEL } from "./constants";

// Factor de velocidad de los carriles: 1 + 0,12 × (nivel − 1), tope ×2,2.
export function laneSpeed(level: number): number {
  return Math.min(MAX_SPEED_FACTOR, 1 + SPEED_PER_LEVEL * (level - 1));
}

// Solape AABB entre dos intervalos [x, x + w) en un mismo eje (celdas).
export function aabb(ax: number, aw: number, bx: number, bw: number): boolean {
  return ax < bx + bw && bx < ax + aw;
}

// Envuelve `x` en el rango [min, min + span).
export function wrap(x: number, min: number, span: number): number {
  return ((((x - min) % span) + span) % span) + min;
}
