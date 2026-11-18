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
export const TURTLE_SURFACE_S = 3.4;
export const TURTLE_WARN_S = 0.6;
export const TURTLE_SUBMERGED_S = 2;
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

// Margen (celdas) fuera del tablero por el que circulan los objetos.
export const WRAP_MARGIN = 2;
