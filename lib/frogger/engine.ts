import { MAX_DT } from "./constants";
import { drawGame } from "./draw";
import { createState, endGame, jump, snapshotOf, stepState } from "./state";
import type {
  Direction,
  FroggerCallbacks,
  FroggerGame,
  FroggerSnapshot,
} from "./types";

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

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
): FroggerGame {
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
    };
  }
  const c: CanvasRenderingContext2D = ctx;

  // ── Estado ────────────────────────────────────────────────────────────────
  let state = createState();
  let paused = false;
  let overReported = false;
  let started = false;
  let destroyed = false;
  let lastTime: number | null = null;
  let rafId = 0;
  let lastSnap: FroggerSnapshot | null = null;

  // ── Snapshot ──────────────────────────────────────────────────────────────
  // Solo se emite cuando cambia algún campo. Con lives = 0 el status es
  // "gameover", así que ese snapshot siempre precede a onGameOver.
  function notify() {
    const s = snapshotOf(state, paused);
    const p = lastSnap;
    if (
      p &&
      p.score === s.score &&
      p.lives === s.lives &&
      p.level === s.level &&
      p.homes === s.homes &&
      p.status === s.status
    ) {
      return;
    }
    lastSnap = s;
    callbacks.onState(s);
  }

  function reportOver() {
    notify();
    if (state.over && !overReported) {
      overReported = true;
      callbacks.onGameOver(state.score);
    }
  }

  function initGame() {
    state = createState();
    paused = false;
    overReported = false;
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function isFormTarget(e: KeyboardEvent): boolean {
    return (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    );
  }

  function onKeyDown(e: KeyboardEvent) {
    if (destroyed || isFormTarget(e)) return;
    const dir = KEY_DIRECTIONS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (e.repeat || paused || state.over) return;
    jump(state, dir);
  }

  // Evita el scroll de las flechas también al soltarlas.
  function onKeyUp(e: KeyboardEvent) {
    if (destroyed || isFormTarget(e)) return;
    if (KEY_DIRECTIONS[e.code]) e.preventDefault();
  }

  // ── Bucle principal ───────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    if (!paused && !state.over) {
      stepState(state, dt);
      if (state.over) reportOver();
    }
    drawGame(c, state);
    notify();
    rafId = requestAnimationFrame(loop);
  }

  // ── API pública ───────────────────────────────────────────────────────────
  function pause() {
    if (destroyed || !started || paused || state.over) return;
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
    if (destroyed || !started) return;
    initGame();
    lastTime = null;
    notify();
  }

  function end() {
    if (destroyed || !started || state.over) return;
    endGame(state);
    reportOver();
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
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  return { start, pause, resume, restart, end, destroy };
}
