import type {
  GameCallbacks,
  GameEngine,
  GameOption,
  GameSnapshot,
} from "@/lib/game-engine";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import { H as ASTEROIDS_H, W as ASTEROIDS_W } from "@/lib/asteroids/constants";
import type { AsteroidsSnapshot } from "@/lib/asteroids/types";
import { createArkanoidGame } from "@/lib/arkanoid/engine";
import {
  CANVAS_H as ARKANOID_H,
  CANVAS_W as ARKANOID_W,
} from "@/lib/arkanoid/constants";
import type { ArkanoidSnapshot } from "@/lib/arkanoid/types";
import { createTetrisGame } from "@/lib/tetris/engine";
import {
  H as TETRIS_H,
  MAX_START_LEVEL,
  W as TETRIS_W,
} from "@/lib/tetris/constants";
import { DEFAULT_SKIN, SKINS } from "@/lib/tetris/skins";
import type { SkinName, TetrisSnapshot } from "@/lib/tetris/types";

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

function tetrisSnapshot(s: TetrisSnapshot): GameSnapshot {
  return {
    score: s.score,
    status: s.status,
    hud: [
      { key: "lines", label: "Líneas", value: String(s.lines) },
      { key: "level", label: "Nivel", value: String(s.level).padStart(2, "0") },
    ],
  };
}

const tetris: GameDefinition = {
  id: "tetris",
  width: TETRIS_W,
  height: TETRIS_H,
  aria: "Tetris",
  options: [
    {
      key: "skin",
      label: "Skin",
      choices: (Object.keys(SKINS) as SkinName[]).map((value) => ({
        value,
        label: SKINS[value].label,
      })),
      defaultValue: DEFAULT_SKIN,
      appliesOn: "live",
    },
    {
      key: "startLevel",
      label: "Nivel inicial",
      choices: Array.from({ length: MAX_START_LEVEL }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      })),
      defaultValue: "1",
      appliesOn: "restart",
    },
  ],
  create: (canvas, cb) => {
    const game = createTetrisGame(canvas, {
      onState: (s) => cb.onState(tetrisSnapshot(s)),
      onGameOver: cb.onGameOver,
    });
    return {
      start: game.start,
      pause: game.pause,
      resume: game.resume,
      restart: game.restart,
      end: game.end,
      destroy: game.destroy,
      setOption: (key, value) => {
        if (key === "skin") game.setSkin(value as SkinName);
        else if (key === "startLevel") game.setStartLevel(Number(value));
      },
    };
  },
};

function arkanoidSnapshot(s: ArkanoidSnapshot): GameSnapshot {
  return {
    score: s.score,
    status: s.status,
    hud: [
      { key: "lives", label: "Vidas", value: "♥ ".repeat(s.lives).trim() },
      { key: "level", label: "Nivel", value: String(s.level).padStart(2, "0") },
    ],
  };
}

const arkanoid: GameDefinition = {
  id: "arkanoid",
  width: ARKANOID_W,
  height: ARKANOID_H,
  aria: "Arkanoid",
  create: (canvas, cb) =>
    createArkanoidGame(canvas, {
      onState: (s) => cb.onState(arkanoidSnapshot(s)),
      onGameOver: cb.onGameOver,
    }),
};

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  asteroids,
  tetris,
  arkanoid,
};

export function getGameDefinition(id: string): GameDefinition | null {
  return Object.hasOwn(GAME_REGISTRY, id) ? GAME_REGISTRY[id] : null;
}
