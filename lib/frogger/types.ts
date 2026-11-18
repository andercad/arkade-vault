export type FroggerStatus = "playing" | "paused" | "gameover";

export interface FroggerSnapshot {
  score: number;
  lives: number; // 0..5
  level: number; // 1+
  homes: number; // casas llenas en el nivel actual, 0..5
  status: FroggerStatus;
}

export interface FroggerCallbacks {
  onState(s: FroggerSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface FroggerGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, 3 vidas, nivel 1
  end(): void; // termina con la puntuación actual
  destroy(): void;
  setSkin(name: SkinName): void;
}

export type SkinName = "classic" | "retro" | "neon";

export interface Cell {
  col: number;
  row: number;
}

export type Direction = "up" | "down" | "left" | "right";
