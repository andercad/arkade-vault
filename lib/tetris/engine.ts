import { createLayerCache, createSpriteCache } from "@/lib/canvas-cache";
import {
  BLOCK,
  BOARD_W,
  COLS,
  GRID_COLOR,
  H,
  LINE_SCORES,
  MAX_START_LEVEL,
  PIECES,
  ROWS,
  W,
} from "./constants";
import { DEFAULT_SKIN, SKINS, type Skin } from "./skins";
import type {
  SkinName,
  TetrisCallbacks,
  TetrisGame,
  TetrisSnapshot,
  TetrisStatus,
} from "./types";
import {
  collide,
  createBoard,
  intervalForLevel,
  rotateCW,
  type Board,
} from "./utils";

// Teclas cuyo comportamiento por defecto (scroll, activar botón con foco) se bloquea.
const BLOCKED_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
];
const PAUSE_KEYS = ["Escape", "KeyP"];
const KICKS = [0, -1, 1, -2, 2];
const MAX_DT = 0.05; // s, tope del delta de tiempo

// Panel lateral dentro del canvas (a la derecha del tablero)
const PANEL_X = BOARD_W + 20;
const NEXT_Y = 330;

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return {
      start: noop,
      pause: noop,
      resume: noop,
      restart: noop,
      end: noop,
      destroy: noop,
      setSkin: noop,
      setStartLevel: noop,
    };
  }
  const c: CanvasRenderingContext2D = ctx;

  // ── Estado ────────────────────────────────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece | null = null;
  let next: Piece | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let startLevel = 1;
  let dropAccum = 0; // ms
  let dropInterval = intervalForLevel(1);
  let paused = false;
  let over = false;
  let overReported = false;
  let started = false;
  let destroyed = false;
  let skin: Skin = SKINS[DEFAULT_SKIN];
  // Cachés (SPEC 14): rejilla estática y bloques con glow (neon).
  const gridLayer = createLayerCache();
  const sprites = createSpriteCache();
  function clearCaches() {
    gridLayer.clear();
    sprites.clear();
  }
  let boardVersion = 0; // invalida la capa de tablero al cambiar `board`
  let lastTime: number | null = null;
  let rafId = 0;
  let lastSnap: TetrisSnapshot | null = null;

  // ── Snapshot ──────────────────────────────────────────────────────────────
  function notify() {
    const status: TetrisStatus = over
      ? "gameover"
      : paused
        ? "paused"
        : "playing";
    const s: TetrisSnapshot = { score, lines, level, status };
    const p = lastSnap;
    if (
      p &&
      p.score === s.score &&
      p.lines === s.lines &&
      p.level === s.level &&
      p.status === s.status
    ) {
      return;
    }
    lastSnap = s;
    callbacks.onState(s);
  }

  // ── Lógica ────────────────────────────────────────────────────────────────
  function initGame() {
    board = createBoard();
    boardVersion++;
    score = 0;
    lines = 0;
    level = startLevel;
    dropInterval = intervalForLevel(level);
    dropAccum = 0;
    paused = false;
    over = false;
    overReported = false;
    current = randomPiece();
    next = randomPiece();
  }

  function ghostY(p: Piece): number {
    let gy = p.y;
    while (!collide(board, p.shape, p.x, gy + 1)) gy++;
    return gy;
  }

  function tryRotate() {
    if (!current) return;
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    if (!current) return;
    boardVersion++;
    for (let r = 0; r < current.shape.length; r++)
      for (let col = 0; col < current.shape[r].length; col++)
        if (current.shape[r][col])
          board[current.y + r][current.x + col] = current.shape[r][col];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      boardVersion++;
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level; // nivel previo al recálculo
      level = startLevel + Math.floor(lines / 10);
      dropInterval = intervalForLevel(level);
    }
  }

  function gameOver() {
    over = true;
    notify();
    if (!overReported) {
      overReported = true;
      callbacks.onGameOver(score);
    }
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (current && collide(board, current.shape, current.x, current.y)) {
      gameOver();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function hardDrop() {
    if (!current) return;
    const gy = ghostY(current);
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!current) return;
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function update(dt: number) {
    if (!current || over) return;
    dropAccum += dt * 1000;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function drawBlock(
    px: number,
    py: number,
    colorIndex: number,
    alpha = 1,
  ): void {
    if (!colorIndex) return;
    const color = skin.colors[colorIndex];
    if (!color) return;
    c.globalAlpha = alpha;
    paintBlock(c, px, py, color);
    c.globalAlpha = 1;
  }

  // Sprite por skin+color en todos los skins (pad 0 sin glow); el fantasma lo
  // vuelca con globalAlpha. Evita decenas de fillRect por bloque cada frame.
  function paintBlock(
    t: CanvasRenderingContext2D,
    px: number,
    py: number,
    color: string,
  ) {
    const sp = sprites.get(
      `${skin.label}:block:${color}`,
      BLOCK,
      BLOCK,
      skin.glow * 2,
      (sc) => skin.draw(sc, 0, 0, BLOCK, color),
    );
    t.drawImage(sp.canvas, px - sp.pad, py - sp.pad);
  }

  function drawGrid(c: CanvasRenderingContext2D, gridColor: string) {
    c.strokeStyle = gridColor;
    c.lineWidth = 0.5;
    for (let col = 1; col < COLS; col++) {
      c.beginPath();
      c.moveTo(col * BLOCK, 0);
      c.lineTo(col * BLOCK, ROWS * BLOCK);
      c.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      c.beginPath();
      c.moveTo(0, r * BLOCK);
      c.lineTo(BOARD_W, r * BLOCK);
      c.stroke();
    }
  }

  function drawPanel(gridColor: string) {
    // separador entre tablero y panel
    c.strokeStyle = gridColor;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(BOARD_W + 0.5, 0);
    c.lineTo(BOARD_W + 0.5, H);
    c.stroke();

    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    const stat = (label: string, value: string, y: number) => {
      c.fillStyle = "#8a8aa0";
      c.font = "12px monospace";
      c.fillText(label, PANEL_X, y);
      c.fillStyle = "#f0f0f8";
      c.font = "bold 22px monospace";
      c.fillText(value, PANEL_X, y + 28);
    };
    stat("SCORE", score.toLocaleString("es-ES"), 50);
    stat("LINES", String(lines), 130);
    stat("LEVEL", String(level), 210);

    c.fillStyle = "#8a8aa0";
    c.font = "12px monospace";
    c.fillText("NEXT", PANEL_X, NEXT_Y - 10);
    c.strokeStyle = gridColor;
    c.strokeRect(PANEL_X + 0.5, NEXT_Y + 0.5, 4 * BLOCK, 4 * BLOCK);
    if (next) {
      const offX = Math.floor((4 - next.shape[0].length) / 2);
      const offY = Math.floor((4 - next.shape.length) / 2);
      for (let r = 0; r < next.shape.length; r++)
        for (let col = 0; col < next.shape[r].length; col++)
          drawBlock(
            PANEL_X + (offX + col) * BLOCK,
            NEXT_Y + (offY + r) * BLOCK,
            next.shape[r][col],
          );
    }
  }

  // Sin overlays de pausa ni game over: los dibuja el contenedor (React).
  function draw() {
    c.clearRect(0, 0, W, H);
    if (skin.bg) {
      c.fillStyle = skin.bg;
      c.fillRect(0, 0, W, H);
    }
    const gridColor = skin.grid ?? GRID_COLOR;
    // Rejilla + bloques fijados cacheados: solo se repintan al cambiar de skin
    // o de tablero (boardVersion).
    gridLayer.draw(c, `${skin.label}:${boardVersion}`, (lc) => {
      drawGrid(lc, gridColor);
      for (let r = 0; r < ROWS; r++)
        for (let col = 0; col < COLS; col++) {
          const color = skin.colors[board[r][col]];
          if (board[r][col] && color)
            paintBlock(lc, col * BLOCK, r * BLOCK, color);
        }
    });

    drawPanel(gridColor);

    // en game over la pieza nueva no cabe: no dibujarla encima del tablero
    if (over || !current) return;

    const gy = ghostY(current);
    for (let r = 0; r < current.shape.length; r++)
      for (let col = 0; col < current.shape[r].length; col++)
        if (current.shape[r][col])
          drawBlock(
            (current.x + col) * BLOCK,
            (gy + r) * BLOCK,
            current.shape[r][col],
            0.2,
          );

    for (let r = 0; r < current.shape.length; r++)
      for (let col = 0; col < current.shape[r].length; col++)
        drawBlock(
          (current.x + col) * BLOCK,
          (current.y + r) * BLOCK,
          current.shape[r][col],
        );
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function isTextTarget(e: KeyboardEvent): boolean {
    return (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    );
  }

  function onKeyDown(e: KeyboardEvent) {
    if (destroyed || isTextTarget(e)) return;
    if (BLOCKED_KEYS.includes(e.code)) e.preventDefault();

    if (PAUSE_KEYS.includes(e.code)) {
      if (e.repeat) return;
      if (paused) resume();
      else pause();
      return;
    }
    if (paused || over || !started || !current) return;

    switch (e.code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y))
          current.x--;
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y))
          current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    notify();
  }

  // Evita que Space active el botón con foco al soltarse.
  function onKeyUp(e: KeyboardEvent) {
    if (destroyed || isTextTarget(e)) return;
    if (BLOCKED_KEYS.includes(e.code)) e.preventDefault();
  }

  // ── Bucle principal ───────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    if (!paused && !over) update(dt);
    draw();
    notify();
    rafId = requestAnimationFrame(loop);
  }

  // ── API pública ───────────────────────────────────────────────────────────
  function pause() {
    if (destroyed || paused || over) return;
    paused = true;
    notify();
  }

  function resume() {
    if (destroyed || !paused) return;
    paused = false;
    lastTime = null; // evita un dt enorme tras la pausa
    notify();
  }

  function restart() {
    if (destroyed) return;
    initGame();
    lastTime = null;
    notify();
  }

  function end() {
    if (destroyed || over) return;
    gameOver();
  }

  function start() {
    if (started || destroyed) return;
    started = true;
    initGame();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    notify();
    rafId = requestAnimationFrame(loop);
  }

  function destroy() {
    destroyed = true;
    clearCaches();
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  function setSkin(name: SkinName) {
    skin = SKINS[name] ?? SKINS[DEFAULT_SKIN];
    clearCaches();
    if (started && !destroyed) draw();
  }

  function setStartLevel(lvl: number) {
    const n = Math.floor(lvl);
    if (!Number.isFinite(n)) return;
    startLevel = Math.min(MAX_START_LEVEL, Math.max(1, n));
  }

  return {
    start,
    pause,
    resume,
    restart,
    end,
    destroy,
    setSkin,
    setStartLevel,
  };
}
