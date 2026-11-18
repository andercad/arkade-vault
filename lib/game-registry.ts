import type {
  GameCallbacks,
  GameEngine,
  GameOption,
  GameSnapshot,
  TouchControls,
} from "@/lib/game-engine";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import { H as ASTEROIDS_H, W as ASTEROIDS_W } from "@/lib/asteroids/constants";
import type {
  AsteroidsSnapshot,
  SkinName as AsteroidsSkinName,
} from "@/lib/asteroids/types";
import {
  DEFAULT_SKIN as ASTEROIDS_DEFAULT_SKIN,
  SKINS as ASTEROIDS_SKINS,
} from "@/lib/asteroids/skins";
import { createArkanoidGame } from "@/lib/arkanoid/engine";
import {
  CANVAS_H as ARKANOID_H,
  CANVAS_W as ARKANOID_W,
} from "@/lib/arkanoid/constants";
import type {
  ArkanoidSnapshot,
  SkinName as ArkanoidSkinName,
} from "@/lib/arkanoid/types";
import {
  DEFAULT_SKIN as ARKANOID_DEFAULT_SKIN,
  SKINS as ARKANOID_SKINS,
} from "@/lib/arkanoid/skins";
import { createTetrisGame } from "@/lib/tetris/engine";
import {
  H as TETRIS_H,
  MAX_START_LEVEL,
  W as TETRIS_W,
} from "@/lib/tetris/constants";
import { createSnakeGame } from "@/lib/snake/engine";
import { H as SNAKE_H, W as SNAKE_W } from "@/lib/snake/constants";
import type {
  SkinName as SnakeSkinName,
  SnakeSnapshot,
} from "@/lib/snake/types";
import {
  DEFAULT_SKIN as SNAKE_DEFAULT_SKIN,
  SKINS as SNAKE_SKINS,
} from "@/lib/snake/skins";
import { createFroggerGame } from "@/lib/frogger/engine";
import { H as FROGGER_H, W as FROGGER_W } from "@/lib/frogger/constants";
import type { FroggerSnapshot } from "@/lib/frogger/types";
import { DEFAULT_SKIN, SKINS } from "@/lib/tetris/skins";
import type { SkinName, TetrisSnapshot } from "@/lib/tetris/types";

export interface GameDefinition {
  id: string; // = games.id
  width: number; // canvas lógico
  height: number;
  aria: string;
  options?: GameOption[];
  touchControls?: TouchControls; // sin él, no se pinta mando táctil
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
  options: [
    {
      key: "skin",
      label: "Skin",
      choices: (Object.keys(ASTEROIDS_SKINS) as AsteroidsSkinName[]).map(
        (value) => ({ value, label: ASTEROIDS_SKINS[value].label }),
      ),
      defaultValue: ASTEROIDS_DEFAULT_SKIN,
      appliesOn: "live",
    },
  ],
  touchControls: {
    dpad: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" },
    actions: [{ code: "Space", label: "DISPARO" }],
  },
  create: (canvas, cb) => {
    const game = createAsteroidsGame(canvas, {
      onState: (s) => cb.onState(asteroidsSnapshot(s)),
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
        if (key === "skin") game.setSkin(value as AsteroidsSkinName);
      },
    };
  },
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
  touchControls: {
    dpad: { left: "ArrowLeft", right: "ArrowRight", down: "ArrowDown" },
    actions: [
      { code: "ArrowUp", label: "GIRAR" },
      { code: "Space", label: "BAJAR" },
    ],
  },
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
  options: [
    {
      key: "skin",
      label: "Skin",
      choices: (Object.keys(ARKANOID_SKINS) as ArkanoidSkinName[]).map(
        (value) => ({ value, label: ARKANOID_SKINS[value].label }),
      ),
      defaultValue: ARKANOID_DEFAULT_SKIN,
      appliesOn: "live",
    },
  ],
  touchControls: {
    dpad: { left: "ArrowLeft", right: "ArrowRight" },
    actions: [{ code: "Space", label: "LANZAR" }],
  },
  create: (canvas, cb) => {
    const game = createArkanoidGame(canvas, {
      onState: (s) => cb.onState(arkanoidSnapshot(s)),
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
        if (key === "skin") game.setSkin(value as ArkanoidSkinName);
      },
    };
  },
};

function snakeSnapshot(s: SnakeSnapshot): GameSnapshot {
  return {
    score: s.score,
    status: s.status,
    hud: [
      { key: "length", label: "Longitud", value: String(s.length) },
      { key: "level", label: "Nivel", value: String(s.level).padStart(2, "0") },
    ],
  };
}

const snake: GameDefinition = {
  id: "snake",
  width: SNAKE_W,
  height: SNAKE_H,
  aria: "Snake",
  options: [
    {
      key: "skin",
      label: "Skin",
      choices: (Object.keys(SNAKE_SKINS) as SnakeSkinName[]).map((value) => ({
        value,
        label: SNAKE_SKINS[value].label,
      })),
      defaultValue: SNAKE_DEFAULT_SKIN,
      appliesOn: "live",
    },
  ],
  touchControls: {
    dpad: {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    },
    actions: [],
  },
  create: (canvas, cb) => {
    const game = createSnakeGame(canvas, {
      onState: (s) => cb.onState(snakeSnapshot(s)),
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
        if (key === "skin") game.setSkin(value as SnakeSkinName);
      },
    };
  },
};

function froggerSnapshot(s: FroggerSnapshot): GameSnapshot {
  return {
    score: s.score,
    status: s.status,
    hud: [
      { key: "lives", label: "Vidas", value: "♥ ".repeat(s.lives).trim() },
      { key: "level", label: "Nivel", value: String(s.level).padStart(2, "0") },
    ],
  };
}

const frogger: GameDefinition = {
  id: "frogger",
  width: FROGGER_W,
  height: FROGGER_H,
  aria: "Frogger",
  create: (canvas, cb) => {
    const game = createFroggerGame(canvas, {
      onState: (s) => cb.onState(froggerSnapshot(s)),
      onGameOver: cb.onGameOver,
    });
    return {
      start: game.start,
      pause: game.pause,
      resume: game.resume,
      restart: game.restart,
      end: game.end,
      destroy: game.destroy,
    };
  },
};

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  asteroids,
  tetris,
  arkanoid,
  snake,
  frogger,
};

export function getGameDefinition(id: string): GameDefinition | null {
  return Object.hasOwn(GAME_REGISTRY, id) ? GAME_REGISTRY[id] : null;
}
