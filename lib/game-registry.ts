import type {
  GameCallbacks,
  GameEngine,
  GameOption,
  GameSnapshot,
} from "@/lib/game-engine";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import { H as ASTEROIDS_H, W as ASTEROIDS_W } from "@/lib/asteroids/constants";
import type { AsteroidsSnapshot } from "@/lib/asteroids/types";

export interface GameDefinition {
  id: string; // = games.id
  width: number; // canvas lógico
  height: number;
  aria: string;
  options?: GameOption[];
  create(canvas: HTMLCanvasElement, cb: GameCallbacks): GameEngine;
}

function asteroidsSnapshot(s: AsteroidsSnapshot): GameSnapshot {
  return {
    score: s.score,
    status: s.status,
    hud: [
      { key: "lives", label: "Vidas", value: "♥ ".repeat(s.lives).trim() },
      { key: "level", label: "Nivel", value: String(s.level).padStart(2, "0") },
    ],
  };
}

const asteroids: GameDefinition = {
  id: "asteroids",
  width: ASTEROIDS_W,
  height: ASTEROIDS_H,
  aria: "Asteroids",
  create: (canvas, cb) =>
    createAsteroidsGame(canvas, {
      onState: (s) => cb.onState(asteroidsSnapshot(s)),
      onGameOver: cb.onGameOver,
    }),
};

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  asteroids,
};

export function getGameDefinition(id: string): GameDefinition | null {
  return Object.hasOwn(GAME_REGISTRY, id) ? GAME_REGISTRY[id] : null;
}
