// Canvas lógico (px). La plataforma lo escala por CSS.
export const COLS = 20;
export const ROWS = 20;
export const CELL = 30;
export const HUD_H = 30; // franja del HUD sobre el tablero
export const W = COLS * CELL; // 600
export const BOARD_H = ROWS * CELL; // 600
export const H = HUD_H + BOARD_H; // 630

export const INITIAL_LENGTH = 3;
export const FRUITS_PER_LEVEL = 5;
export const POINTS_PER_FRUIT = 10; // × nivel

export const MAX_DT = 0.05; // límite de delta time por frame (s)
export const BASE_STEP_MS = 140; // intervalo de paso en el nivel 1
export const MIN_STEP_MS = 70;
export const STEP_MS_PER_LEVEL = 10;

export const SPRITESHEET_SRC = "/games/snake/fruits.png";
