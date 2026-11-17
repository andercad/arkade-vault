export type SnakeStatus = "playing" | "paused" | "gameover";

export interface SnakeSnapshot {
  score: number;
  length: number; // celdas de la serpiente
  level: number; // 1+
  status: SnakeStatus;
}

export interface SnakeCallbacks {
  onState(s: SnakeSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface SnakeGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, longitud 3, nivel 1
  end(): void;
  destroy(): void;
  setSkin(name: SkinName): void;
}

export type SkinName = "classic" | "retro" | "neon";

export interface Cell {
  col: number;
  row: number;
}

export type Direction = "up" | "down" | "left" | "right";
