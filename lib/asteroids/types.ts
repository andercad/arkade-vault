// "dead" = nave destruida esperando reaparecer (deadTimer del original)
export type AsteroidsStatus = "playing" | "dead" | "paused" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  tripleSeconds: number; // Math.ceil del tiempo restante del power-up, 0 si no hay
  status: AsteroidsStatus;
}

export interface AsteroidsCallbacks {
  onState(s: AsteroidsSnapshot): void; // solo cuando algún campo cambia
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface AsteroidsGame {
  start(): void; // inicia partida y bucle
  pause(): void; // congela update; el bucle sigue dibujando el último frame
  resume(): void;
  restart(): void; // initGame() y status "playing"
  end(): void; // fuerza game over desde cualquier estado (botón FIN)
  destroy(): void; // cancela rAF y quita todos los listeners
}
