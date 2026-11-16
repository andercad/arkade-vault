export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// Canvas lógico: tablero 300×600 a la izquierda + panel lateral de 160 px.
export const W = 460;
export const H = 600;
export const BOARD_W = COLS * BLOCK;

export const MAX_START_LEVEL = 15;

// Rejilla por defecto (la skin Neon define la suya).
export const GRID_COLOR = "#22222e";

// Piezas (índice = tipo: I O T S Z J L N). Índice 0 sin uso.
export const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N - tuerca (hueco central)
];

export const LINE_SCORES = [0, 100, 300, 500, 800];

// Paletas por skin (índice = tipo de pieza: I O T S Z J L N)
export const RETRO_COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#b0bec5", // N - tuerca (gris metálico)
];
export const NEON_COLORS: (string | null)[] = [
  null,
  "#00fff7",
  "#ffee00",
  "#d400ff",
  "#39ff14",
  "#ff073a",
  "#2979ff",
  "#ff9100",
  "#e0e0e0",
];
export const PASTEL_COLORS: (string | null)[] = [
  null,
  "#a8e6f0",
  "#fff3b0",
  "#d7b8f3",
  "#b9f0c4",
  "#ffb3b3",
  "#b5d3ff",
  "#ffd3a5",
  "#d9e2e7",
];
export const PIXEL_COLORS: (string | null)[] = [
  null,
  "#29b6f6",
  "#fdd835",
  "#ab47bc",
  "#66bb6a",
  "#ef5350",
  "#5c6bc0",
  "#ff9800",
  "#90a4ae",
];
