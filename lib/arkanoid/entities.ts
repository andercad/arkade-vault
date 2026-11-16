import {
  BRICK_COLORS,
  BRICK_COLS,
  BRICK_H,
  BRICK_ROWS,
  BRICK_TOP,
  BRICK_W,
  PARTICLE_COLORS,
  PARTICLE_COUNT,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN,
} from "./constants";
import { LEVELS } from "./levels";

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  age: number; // ms
}

export interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  age: number; // ms, envejece con dt
}

// Bloques del patrón del nivel (1..5).
export function createBricks(level: number): Brick[] {
  const pattern = LEVELS[level - 1];
  const bricks: Brick[] = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      if (pattern[row][col] !== "X") continue;
      bricks.push({
        x: col * BRICK_W,
        y: BRICK_TOP + row * BRICK_H,
        w: BRICK_W,
        h: BRICK_H,
        color: BRICK_COLORS[row],
        alive: true,
      });
    }
  }
  return bricks;
}

// Partículas de un bloque roto: nacen en su centro, dirección y velocidad aleatorias.
// Usa Math.random: llamar solo desde el motor (dentro de useEffect).
export function spawnParticles(brick: Brick): Particle[] {
  const cx = brick.x + brick.w / 2;
  const cy = brick.y + brick.h / 2;
  const out: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed =
      PARTICLE_SPEED_MIN +
      Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
    out.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: PARTICLE_COLORS[brick.color],
      age: 0,
    });
  }
  return out;
}
