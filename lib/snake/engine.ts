import {
  BOARD_H,
  CELL,
  COLS,
  H,
  HUD_H,
  INITIAL_LENGTH,
  MAX_DT,
  POINTS_PER_FRUIT,
  ROWS,
  W,
} from "./constants";
import { FRUIT_KEYS, drawFruit, loadSpritesheet } from "./sprites";
import { DEFAULT_SKIN, SKINS, type Skin } from "./skins";
import type {
  Cell,
  Direction,
  SkinName,
  SnakeCallbacks,
  SnakeGame,
  SnakeSnapshot,
  SnakeStatus,
} from "./types";
import { levelFor, opposite, randomFreeCell, stepInterval } from "./utils";

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const PAUSE_KEYS = ["Escape", "KeyP"];
const MAX_QUEUE = 2;

const DELTAS: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const GRID_COLOR = "rgba(255, 255, 255, 0.05)";

interface Fruit {
  cell: Cell;
  key: string;
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeGame {
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
    };
  }
  const c: CanvasRenderingContext2D = ctx;
  let skin: Skin = SKINS[DEFAULT_SKIN];

  // ── Estado ────────────────────────────────────────────────────────────────
  let body: Cell[] = []; // cabeza primero
  let dir: Direction = "right";
  let queue: Direction[] = [];
  let fruit: Fruit | null = null;
  let fruitsEaten = 0;
  let score = 0;
  let level = 1;
  let stepAccum = 0; // ms
  let paused = false;
  let over = false;
  let overReported = false;
  let started = false;
  let loaded = false;
  let destroyed = false;
  let sheet: CanvasImageSource | null = null;
  let cancelLoad: (() => void) | null = null;
  let lastTime: number | null = null;
  let rafId = 0;
  let lastSnap: SnakeSnapshot | null = null;

  // ── Snapshot ──────────────────────────────────────────────────────────────
  function notify() {
    const status: SnakeStatus = over
      ? "gameover"
      : paused
        ? "paused"
        : "playing";
    const s: SnakeSnapshot = { score, length: body.length, level, status };
    const p = lastSnap;
    if (
      p &&
      p.score === s.score &&
      p.length === s.length &&
      p.level === s.level &&
      p.status === s.status
    ) {
      return;
    }
    lastSnap = s;
    callbacks.onState(s);
  }

  // ── Lógica ────────────────────────────────────────────────────────────────
  function spawnFruit(): boolean {
    const cell = randomFreeCell(body);
    if (!cell) {
      fruit = null;
      return false;
    }
    const key = FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
    fruit = { cell, key };
    return true;
  }

  function initGame() {
    const startCol = Math.floor(COLS / 2);
    const startRow = Math.floor(ROWS / 2);
    body = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
      col: startCol - i,
      row: startRow,
    }));
    dir = "right";
    queue = [];
    fruitsEaten = 0;
    score = 0;
    level = 1;
    stepAccum = 0;
    paused = false;
    over = false;
    overReported = false;
    spawnFruit();
  }

  function gameOver() {
    over = true;
    queue = [];
    notify();
    if (!overReported) {
      overReported = true;
      callbacks.onGameOver(score);
    }
  }

  function step() {
    if (queue.length > 0) dir = queue.shift() as Direction;
    const head = body[0];
    const d = DELTAS[dir];
    const next: Cell = { col: head.col + d.col, row: head.row + d.row };

    if (next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS) {
      gameOver();
      return;
    }

    const eating =
      fruit !== null &&
      fruit.cell.col === next.col &&
      fruit.cell.row === next.row;

    // La cola que se libera en este paso (sin comer) no cuenta como colisión.
    const limit = eating ? body.length : body.length - 1;
    for (let i = 0; i < limit; i++) {
      if (body[i].col === next.col && body[i].row === next.row) {
        gameOver();
        return;
      }
    }

    body.unshift(next);
    if (!eating) {
      body.pop();
      return;
    }

    // Comer: puntos con el nivel previo al recálculo; la serpiente crece 1.
    fruitsEaten += 1;
    score += POINTS_PER_FRUIT * level;
    level = levelFor(fruitsEaten);
    if (!spawnFruit()) gameOver(); // tablero lleno: victoria
  }

  function update(dt: number) {
    stepAccum += dt * 1000;
    while (!over) {
      const interval = stepInterval(level);
      if (stepAccum < interval) break;
      stepAccum -= interval;
      step();
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function drawGrid() {
    c.strokeStyle = skin.grid;
    c.lineWidth = 1;
    c.beginPath();
    for (let col = 1; col < COLS; col++) {
      c.moveTo(col * CELL + 0.5, 0);
      c.lineTo(col * CELL + 0.5, BOARD_H);
    }
    for (let row = 1; row < ROWS; row++) {
      c.moveTo(0, row * CELL + 0.5);
      c.lineTo(W, row * CELL + 0.5);
    }
    c.stroke();
  }

  function drawEyes(head: Cell) {
    const cx = head.col * CELL + CELL / 2;
    const cy = head.row * CELL + CELL / 2;
    const d = DELTAS[dir];
    // Los ojos van hacia delante y separados en el eje perpendicular.
    const fx = d.col * 6;
    const fy = d.row * 6;
    const px = d.row * 6; // perpendicular
    const py = d.col * 6;
    for (const sign of [-1, 1]) {
      const ex = cx + fx + px * sign;
      const ey = cy + fy + py * sign;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(ex, ey, 3.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#0b0b14";
      c.beginPath();
      c.arc(ex + d.col * 1.2, ey + d.row * 1.2, 1.7, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawHud() {
    c.fillStyle = "#12121f";
    c.fillRect(0, 0, W, HUD_H);
    c.strokeStyle = GRID_COLOR;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, HUD_H - 0.5);
    c.lineTo(W, HUD_H - 0.5);
    c.stroke();
    c.font = "bold 14px monospace";
    c.textBaseline = "middle";
    c.fillStyle = "#f0f0f8";
    c.textAlign = "left";
    c.fillText(`PUNTOS: ${score}`, 10, HUD_H / 2);
    c.textAlign = "center";
    c.fillText(`NIVEL: ${level}`, W / 2, HUD_H / 2);
    c.textAlign = "right";
    c.fillText(`LONGITUD: ${body.length}`, W - 10, HUD_H / 2);
  }

  // Sin overlays de pausa ni game over: los dibuja el contenedor (React).
  function draw() {
    c.clearRect(0, 0, W, H);
    if (skin.bg) {
      c.fillStyle = skin.bg;
      c.fillRect(0, 0, W, H);
    }

    // El tablero va desplazado bajo la franja del HUD.
    c.save();
    c.translate(0, HUD_H);
    drawGrid();
    if (fruit) {
      if (skin.glowFruit) {
        c.save();
        c.shadowColor = skin.glowFruit;
        c.shadowBlur = 14;
        drawFruit(c, sheet, fruit.key, fruit.cell);
        c.restore();
      } else {
        drawFruit(c, sheet, fruit.key, fruit.cell);
      }
    }
    for (let i = body.length - 1; i >= 1; i--)
      skin.drawSegment(c, body[i], skin.colors.body, false);
    skin.drawSegment(c, body[0], skin.colors.head, true);
    drawEyes(body[0]);
    c.restore();

    drawHud();
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function isFormTarget(e: KeyboardEvent): boolean {
    return (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    );
  }

  function enqueue(next: Direction) {
    if (queue.length >= MAX_QUEUE) return;
    const last = queue.length > 0 ? queue[queue.length - 1] : dir;
    if (next === last || next === opposite(last)) return;
    queue.push(next);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (destroyed || isFormTarget(e)) return;
    const turn = KEY_DIRECTIONS[e.code];
    if (turn) e.preventDefault();

    if (PAUSE_KEYS.includes(e.code)) {
      if (e.repeat || !loaded) return;
      if (paused) resume();
      else pause();
      return;
    }
    if (!turn || paused || over || !loaded) return;
    enqueue(turn);
  }

  // Evita que Space active el botón con foco al soltarse.
  function onKeyUp(e: KeyboardEvent) {
    if (destroyed || isFormTarget(e)) return;
    if (e.code === "Space" || KEY_DIRECTIONS[e.code]) e.preventDefault();
  }

  function onBlur() {
    queue = [];
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

  function begin() {
    if (destroyed) return;
    loaded = true;
    notify();
    rafId = requestAnimationFrame(loop);
  }

  // ── API pública ───────────────────────────────────────────────────────────
  function pause() {
    if (destroyed || !loaded || paused || over) return;
    paused = true;
    queue = [];
    notify();
  }

  function resume() {
    if (destroyed || !paused) return;
    paused = false;
    lastTime = null; // evita un dt enorme tras la pausa
    notify();
  }

  function restart() {
    if (destroyed || !loaded) return;
    initGame();
    lastTime = null;
    notify();
  }

  function end() {
    if (destroyed || !loaded || over) return;
    gameOver();
  }

  function start() {
    if (started || destroyed) return;
    started = true;
    initGame();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    // El bucle no arranca hasta que la imagen carga (o falla).
    cancelLoad = loadSpritesheet(
      (img) => {
        sheet = img;
        begin();
      },
      () => {
        sheet = null; // sin sprites: la fruta se dibuja como círculo
        begin();
      },
    );
  }

  function destroy() {
    destroyed = true;
    cancelLoad?.();
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  }

  function setSkin(name: SkinName) {
    skin = SKINS[name] ?? SKINS[DEFAULT_SKIN];
    if (started && !destroyed && loaded) draw();
  }

  return { start, pause, resume, restart, end, destroy, setSkin };
}
