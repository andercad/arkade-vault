import {
  COLS,
  DEATH_MS,
  FROG_HITBOX,
  HOME_COLS,
  HOME_ROW,
  JUMP_MS,
  RIVER_FIRST_ROW,
  RIVER_LAST_ROW,
  ROAD_FIRST_ROW,
  ROAD_LAST_ROW,
  ROWS,
  START,
} from "./constants";
import { turtleState, type LaneState } from "./lanes";
import type { Direction } from "./types";
import { aabb, laneSpeed } from "./utils";

export type DeathCause =
  "road" | "water" | "wall" | "home" | "offscreen" | "time";

export interface Frog {
  x: number; // borde izquierdo en celdas (continuo mientras flota)
  row: number; // fila lógica (cambia al aterrizar)
  dir: Direction; // orientación del sprite
  best: number; // fila más alta (número menor) alcanzada en esta vida
  jumpMs: number; // ms transcurridos del salto; -1 = sin salto
  fromX: number;
  fromRow: number;
  toX: number;
  toRow: number;
  dead: boolean;
  cause: DeathCause | null;
  deathMs: number;
}

export type FrogEvent =
  | { type: "newRow"; row: number }
  | { type: "home"; index: number }
  | { type: "died"; cause: DeathCause }
  | { type: "respawn" };

const EMPTY: FrogEvent[] = [];

const DELTAS: Record<Direction, { col: number; row: number }> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export function createFrog(): Frog {
  return {
    x: START.col,
    row: START.row,
    dir: "up",
    best: START.row,
    jumpMs: -1,
    fromX: START.col,
    fromRow: START.row,
    toX: START.col,
    toRow: START.row,
    dead: false,
    cause: null,
    deathMs: 0,
  };
}

// Reaparición en la casilla de inicio con la fila más alta reiniciada.
export function resetFrog(frog: Frog) {
  Object.assign(frog, createFrog());
}

export function isJumping(frog: Frog): boolean {
  return frog.jumpMs >= 0;
}

// Posición dibujable (interpolada durante el salto), en celdas.
export function frogDrawPos(frog: Frog): { x: number; row: number } {
  if (!isJumping(frog)) return { x: frog.x, row: frog.row };
  const k = Math.min(1, frog.jumpMs / JUMP_MS);
  return {
    x: frog.fromX + (frog.toX - frog.fromX) * k,
    row: frog.fromRow + (frog.toRow - frog.fromRow) * k,
  };
}

// Devuelve true si el salto se acepta. Se ignora en pleno salto, muerta o
// fuera del tablero.
export function tryJump(frog: Frog, dir: Direction): boolean {
  if (frog.dead || isJumping(frog)) return false;
  const d = DELTAS[dir];
  const row = frog.row + d.row;
  if (row < 0 || row >= ROWS) return false;
  let toX = frog.x;
  if (d.col !== 0) {
    // Al saltar lateralmente se ajusta a la celda más cercana antes del salto.
    toX = Math.round(frog.x) + d.col;
    if (toX < 0 || toX >= COLS) return false;
  }
  frog.dir = dir;
  frog.fromX = frog.x;
  frog.fromRow = frog.row;
  frog.toX = toX;
  frog.toRow = row;
  frog.jumpMs = 0;
  return true;
}

export function killFrog(frog: Frog, cause: DeathCause): FrogEvent[] {
  if (frog.dead) return EMPTY;
  frog.dead = true;
  frog.cause = cause;
  frog.deathMs = 0;
  frog.jumpMs = -1;
  return [{ type: "died", cause }];
}

function laneAt(lanes: LaneState[], row: number): LaneState | undefined {
  return lanes.find((l) => l.def.row === row);
}

// Resuelve la llegada a la fila de casas: hueco libre = casa, resto = muerte.
function resolveHome(
  frog: Frog,
  filled: readonly boolean[],
  events: FrogEvent[],
) {
  const col = Math.round(frog.x);
  const index = HOME_COLS.indexOf(col);
  if (index === -1) {
    events.push(...killFrog(frog, "wall"));
  } else if (filled[index]) {
    events.push(...killFrog(frog, "home"));
  } else {
    events.push({ type: "home", index });
  }
}

// Colisiones de la fila actual (frog quieta). Aplica el arrastre del río.
function checkTerrain(
  frog: Frog,
  lanes: LaneState[],
  level: number,
  dt: number,
  events: FrogEvent[],
) {
  const row = frog.row;

  if (row >= ROAD_FIRST_ROW && row <= ROAD_LAST_ROW) {
    const lane = laneAt(lanes, row);
    if (!lane) return;
    const pad = (1 - FROG_HITBOX) / 2;
    const hit = lane.objs.some((o) =>
      aabb(frog.x + pad, FROG_HITBOX, o.x, o.len),
    );
    if (hit) events.push(...killFrog(frog, "road"));
    return;
  }

  if (row >= RIVER_FIRST_ROW && row <= RIVER_LAST_ROW) {
    const lane = laneAt(lanes, row);
    if (!lane) return;
    const cx = frog.x + 0.5;
    const support = lane.objs.find(
      (o) =>
        cx >= o.x &&
        cx < o.x + o.len &&
        (lane.def.kind !== "turtle" || turtleState(o) !== "down"),
    );
    if (!support) {
      events.push(...killFrog(frog, "water"));
      return;
    }
    frog.x += lane.def.dir * lane.def.speed * laneSpeed(level) * dt;
    if (frog.x < -0.5 || frog.x > COLS - 0.5) {
      events.push(...killFrog(frog, "offscreen"));
    }
  }
}

// Avanza la rana `dt` segundos. Los carriles ya deben haberse movido este
// frame. Devuelve los eventos ocurridos (vacío casi siempre).
export function updateFrog(
  frog: Frog,
  lanes: LaneState[],
  filled: readonly boolean[],
  level: number,
  dt: number,
): FrogEvent[] {
  if (frog.dead) {
    frog.deathMs += dt * 1000;
    return frog.deathMs >= DEATH_MS ? [{ type: "respawn" }] : EMPTY;
  }

  const events: FrogEvent[] = [];

  if (isJumping(frog)) {
    frog.jumpMs += dt * 1000;
    if (frog.jumpMs < JUMP_MS) return EMPTY;
    // Aterriza.
    frog.x = frog.toX;
    frog.row = frog.toRow;
    frog.jumpMs = -1;
    if (frog.row < frog.best) {
      frog.best = frog.row;
      events.push({ type: "newRow", row: frog.row });
    }
    if (frog.row === HOME_ROW) {
      resolveHome(frog, filled, events);
      return events;
    }
    // Sin arrastre en el frame de aterrizaje: solo se comprueba el soporte.
    checkTerrain(frog, lanes, level, 0, events);
    return events.length > 0 ? events : EMPTY;
  }

  checkTerrain(frog, lanes, level, dt, events);
  return events.length > 0 ? events : EMPTY;
}
