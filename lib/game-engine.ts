// Contrato común de motores de juego (lo implementan los adaptadores del registro).
export type GameStatus = "playing" | "paused" | "gameover" | "dead";

export interface HudItem {
  key: string; // "lives" | "level" | "lines"; se usa como clase CSS `hud-stat <key>`
  label: string; // "Vidas", "Nivel", "Líneas"
  value: string; // ya formateado: "♥ ♥ ♥", "03"
}

export interface GameSnapshot {
  score: number;
  status: GameStatus;
  hud: HudItem[]; // campos propios del juego, además de Jugador y Puntuación
}

export interface GameCallbacks {
  onState(s: GameSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  end(): void;
  destroy(): void;
  setOption?(key: string, value: string): void;
}

export interface GameOption {
  key: string; // "skin" | "startLevel"
  label: string;
  choices: { value: string; label: string }[];
  defaultValue: string;
  appliesOn: "live" | "restart"; // skin: live; startLevel: restart
}

export type TouchDirection = "up" | "down" | "left" | "right";

export interface TouchButton {
  code: string; // KeyboardEvent.code que emite: "Space", "ArrowUp"
  label: string; // texto del botón: "DISPARO"
}

export interface TouchControls {
  dpad: Partial<Record<TouchDirection, string>>; // dirección → code; solo las que usa el juego
  actions: TouchButton[]; // 0-2 botones a la derecha
}
