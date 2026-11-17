// Canvas lógico (px). La plataforma lo escala por CSS.
export const CANVAS_W = 480;
export const CANVAS_H = 640;

export const MAX_DT = 1 / 30; // límite de delta time por frame (s)

export const BRICK_COLS = 10;
export const BRICK_ROWS = 6;
export const BRICK_W = 48; // 480 / 10 (sprite 32x16 escalado x1.5)
export const BRICK_H = 24;
export const BRICK_TOP = 80; // margen superior para el HUD
export const BRICK_COLORS = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
] as const; // de arriba a abajo
export const BRICK_POINTS = 10;

export const INITIAL_LIVES = 3;
export const LEVEL_COUNT = 5;
export const LEVEL_SPEED_STEP = 0.08; // +8 % de BALL_SPEED por nivel

export const PADDLE_W = 96;
export const PADDLE_H = 14;
export const PADDLE_Y = 600;
export const PADDLE_SPEED = 420; // px/s (teclado)

export const BALL_SIZE = 14;
export const BALL_SPEED = 360; // px/s, constante dentro del nivel
export const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° respecto a la vertical

export const PARTICLE_COUNT = 8; // partículas por bloque roto
export const PARTICLE_SIZE = 4; // lado del cuadrado en px
export const PARTICLE_LIFE = 400; // ms de vida
export const PARTICLE_SPEED_MIN = 60; // px/s
export const PARTICLE_SPEED_MAX = 180; // px/s
export const PARTICLE_GRAVITY = 900; // px/s², hacia abajo
// Paletas por skin (clave = color de bloque).
export const CLASSIC_COLORS: Record<string, string> = {
  red: "#e53935",
  yellow: "#fdd835",
  cyan: "#26c6da",
  magenta: "#ab47bc",
  hotpink: "#ff4081",
  green: "#43a047",
};
export const RETRO_COLORS: Record<string, string> = {
  red: "#e8554e",
  yellow: "#f2d45c",
  cyan: "#4cc9d6",
  magenta: "#b46bd1",
  hotpink: "#f06fa0",
  green: "#5fb870",
};
export const NEON_COLORS: Record<string, string> = {
  red: "#ff1744",
  yellow: "#ffee00",
  cyan: "#00f0ff",
  magenta: "#d500f9",
  hotpink: "#ff2d95",
  green: "#39ff14",
};
export const PARTICLE_COLORS = CLASSIC_COLORS;
export const CLASSIC_BG = "#14142b"; // fondo del canvas en classic (bg: null)

export const EXPLOSION_DURATION = 150; // ms (4 frames)

export const SPRITESHEET_SRC = "/games/arkanoid/spritesheet-breakout.png";
export const SOUND_BOUNCE_SRC = "/games/arkanoid/ball-bounce.mp3";
export const SOUND_BREAK_SRC = "/games/arkanoid/break-sound.mp3";
