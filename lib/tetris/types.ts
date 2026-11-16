export type TetrisStatus = "playing" | "paused" | "gameover";
export type SkinName = "retro" | "neon" | "pastel" | "pixel";

export interface TetrisSnapshot {
  score: number;
  lines: number;
  level: number;
  status: TetrisStatus;
}

export interface TetrisCallbacks {
  onState(s: TetrisSnapshot): void; // solo cuando algún campo cambia
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface TetrisGame {
  start(): void; // inicia partida y bucle
  pause(): void;
  resume(): void;
  restart(): void; // aplica startLevel vigente
  end(): void; // fuerza game over (botón FIN)
  destroy(): void; // cancela rAF y quita todos los listeners
  setSkin(name: SkinName): void; // redibuja al instante
  setStartLevel(level: number): void; // 1..15, se aplica en restart()
}
