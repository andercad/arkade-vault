// Canvas lógico (px). La plataforma lo escala por CSS.
export const CELL = 40;
export const COLS = 15;
export const ROWS = 13;
export const HUD_H = 40; // franja del HUD sobre el tablero
export const W = COLS * CELL; // 600
export const BOARD_H = ROWS * CELL; // 520
export const H = HUD_H + BOARD_H; // 560

// Filas del tablero (0 = casas).
export const HOME_ROW = 0;
export const RIVER_FIRST_ROW = 1;
export const RIVER_LAST_ROW = 5;
export const MEDIAN_ROW = 6;
export const ROAD_FIRST_ROW = 7;
export const ROAD_LAST_ROW = 11;
export const START_ROW = 12;

export const START = { col: 7, row: START_ROW };
export const HOME_COLS = [1, 4, 7, 10, 13];

export const LIVES = 3;
export const MAX_LIVES = 5;
export const TIME_LIMIT = 30; // s por vida

export const FROG_HITBOX = 0.6; // celdas
export const JUMP_MS = 80;
export const DEATH_MS = 800;
export const MAX_DT = 0.05; // límite de delta time por frame (s)

// Tortugas: ciclo de inmersión (s).
export const TURTLE_SURFACE_S = 6;
export const TURTLE_WARN_S = 1.2;
export const TURTLE_SUBMERGED_S = 1.5;
export const TURTLE_CYCLE_S =
  TURTLE_SURFACE_S + TURTLE_WARN_S + TURTLE_SUBMERGED_S;

// Velocidad por nivel.
export const SPEED_PER_LEVEL = 0.12;
export const MAX_SPEED_FACTOR = 2.2;

// Puntuación.
export const POINTS_NEW_ROW = 10;
export const POINTS_HOME = 50;
export const POINTS_PER_SECOND = 10;
export const POINTS_ALL_HOMES = 1000;
export const FIRST_EXTRA_LIFE = 10000;
export const NEXT_EXTRA_LIFE_EVERY = 20000;

// Paletas por skin.
export interface FroggerPalette {
  bg: string;
  hud: string;
  hudLine: string;
  text: string;
  wall: string;
  wallEdge: string;
  water: string;
  waterWave: string;
  road: string;
  roadLine: string;
  safe: string;
  safeEdge: string;
  log: string;
  logEdge: string;
  shell: string;
  shellEdge: string;
  shellWarn: string;
  frog: string;
  frogDark: string;
  frogDeadRoad: string;
  frogDeadWater: string;
  cars: string[];
  trucks: string[];
}

export const CLASSIC_COLORS: FroggerPalette = {
  bg: "#0b0b14",
  hud: "#12121f",
  hudLine: "rgba(255, 255, 255, 0.08)",
  text: "#f0f0f8",
  wall: "#14532d",
  wallEdge: "#0d3b20",
  water: "#0b3d91",
  waterWave: "rgba(120, 190, 255, 0.18)",
  road: "#3a3a42",
  roadLine: "rgba(255, 255, 255, 0.55)",
  safe: "#2e7d32",
  safeEdge: "#1f5c24",
  log: "#7a4a21",
  logEdge: "#4f2f12",
  shell: "#2f9e44",
  shellEdge: "#1b6b2c",
  shellWarn: "#7fd18f",
  frog: "#7CFC00",
  frogDark: "#3fa800",
  frogDeadRoad: "#d94040",
  frogDeadWater: "#8ec9ff",
  cars: ["#ff4d6d", "#ffd23f", "#00f0ff", "#ff9f1c", "#c77dff"],
  trucks: ["#e5e5ef", "#ff8c42", "#8ecae6", "#ffb703", "#d0d0dc"],
};

export const RETRO_COLORS: FroggerPalette = {
  bg: "#1a1a2e",
  hud: "#22223b",
  hudLine: "rgba(255, 255, 255, 0.15)",
  text: "#f4f1de",
  wall: "#3d8b5a",
  wallEdge: "#2a6a41",
  water: "#3a6fd8",
  waterWave: "rgba(255, 255, 255, 0.22)",
  road: "#5b5b73",
  roadLine: "rgba(255, 255, 220, 0.7)",
  safe: "#5fb760",
  safeEdge: "#3f8f45",
  log: "#c9803f",
  logEdge: "#8f5522",
  shell: "#4cc26b",
  shellEdge: "#2c8a48",
  shellWarn: "#b8f0c0",
  frog: "#a6ff4d",
  frogDark: "#56c21e",
  frogDeadRoad: "#ff5a5a",
  frogDeadWater: "#a9d8ff",
  cars: ["#ff6b8b", "#ffd84d", "#4dd8ff", "#ffa94d", "#d49bff"],
  trucks: ["#f2f2e8", "#ff9a5c", "#9ad4ee", "#ffc933", "#dcdce6"],
};

export const NEON_COLORS: FroggerPalette = {
  bg: "#000000",
  hud: "#05050a",
  hudLine: "rgba(0, 240, 255, 0.5)",
  text: "#e8ffff",
  wall: "#0a2a18",
  wallEdge: "#39ff14",
  water: "#02082a",
  waterWave: "rgba(0, 240, 255, 0.45)",
  road: "#0a0a12",
  roadLine: "rgba(255, 255, 255, 0.7)",
  safe: "#06180c",
  safeEdge: "#39ff14",
  log: "#ff9100",
  logEdge: "#ffc266",
  shell: "#00ffa6",
  shellEdge: "#9dffe0",
  shellWarn: "#e8fff6",
  frog: "#39ff14",
  frogDark: "#00c853",
  frogDeadRoad: "#ff1744",
  frogDeadWater: "#00e5ff",
  cars: ["#ff2d95", "#ffee00", "#00f0ff", "#ff9100", "#b388ff"],
  trucks: ["#ffffff", "#ff6d00", "#40c4ff", "#ffd600", "#e0e0ff"],
};

// Margen (celdas) fuera del tablero por el que circulan los objetos.
export const WRAP_MARGIN = 2;
