export type ArkanoidStatus = "playing" | "paused" | "gameover";

export interface ArkanoidSnapshot {
  score: number;
  lives: number;
  level: number; // 1..5
  status: ArkanoidStatus;
}

export interface ArkanoidCallbacks {
  onState(s: ArkanoidSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida (derrota o victoria)
}

export interface ArkanoidGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, 3 vidas, nivel 1
  end(): void;
  destroy(): void;
}
