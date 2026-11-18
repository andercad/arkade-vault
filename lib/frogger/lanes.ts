import {
  COLS,
  TURTLE_CYCLE_S,
  TURTLE_SURFACE_S,
  TURTLE_WARN_S,
} from "./constants";
import { laneSpeed, wrap } from "./utils";

export type LaneKind = "road" | "log" | "turtle";

export interface LaneDef {
  row: number; // 1..5 río, 7..11 carretera
  kind: LaneKind;
  dir: 1 | -1;
  speed: number; // celdas/s en nivel 1
  objLen: number; // celdas por objeto
  gap: number; // celdas entre objetos
}

export const LANES: LaneDef[] = [
  // Río (de arriba abajo: filas 1..5)
  { row: 1, kind: "log", dir: 1, speed: 1.8, objLen: 3, gap: 3 },
  { row: 2, kind: "turtle", dir: -1, speed: 1.6, objLen: 2, gap: 3 },
  { row: 3, kind: "log", dir: 1, speed: 2.4, objLen: 6, gap: 4 },
  { row: 4, kind: "log", dir: 1, speed: 1.5, objLen: 4, gap: 3 },
  { row: 5, kind: "turtle", dir: -1, speed: 1.2, objLen: 3, gap: 3 },
  // Carretera (filas 7..11)
  { row: 7, kind: "road", dir: -1, speed: 1.0, objLen: 3, gap: 6 },
  { row: 8, kind: "road", dir: 1, speed: 2.6, objLen: 1, gap: 3 },
  { row: 9, kind: "road", dir: -1, speed: 1.2, objLen: 2, gap: 5 },
  { row: 10, kind: "road", dir: 1, speed: 2.0, objLen: 1, gap: 5 },
  { row: 11, kind: "road", dir: -1, speed: 1.5, objLen: 1, gap: 4 },
];

// ── Objetos en movimiento ────────────────────────────────────────────────────

export interface LaneObject {
  x: number; // borde izquierdo, en celdas (continuo)
  len: number; // celdas
  t: number; // reloj de inmersión (s); solo tortugas
}

export interface LaneState {
  def: LaneDef;
  objs: LaneObject[];
  min: number; // x mínimo del recorrido (objeto totalmente fuera por la izquierda)
  span: number; // longitud del recorrido; múltiplo del periodo objLen + gap
}

export type TurtleState = "up" | "warn" | "down";

// Los objetos recorren [min, min + span): salen del tablero por un lado y
// reaparecen por el otro. `span` es múltiplo del periodo, así que el reparto
// regular se mantiene y nunca se solapan en el mismo carril.
export function createLane(def: LaneDef): LaneState {
  const period = def.objLen + def.gap;
  const span = Math.ceil((COLS + def.objLen) / period) * period;
  const min = -def.objLen;
  const count = span / period;
  const objs: LaneObject[] = Array.from({ length: count }, (_, i) => ({
    x: min + i * period,
    len: def.objLen,
    t: (i * TURTLE_CYCLE_S * 0.37) % TURTLE_CYCLE_S, // fase desfasada por grupo
  }));
  return { def, objs, min, span };
}

export function createLanes(): LaneState[] {
  return LANES.map(createLane);
}

export function advanceLane(lane: LaneState, level: number, dt: number) {
  const dx = lane.def.dir * lane.def.speed * laneSpeed(level) * dt;
  for (const o of lane.objs) {
    o.x = wrap(o.x + dx, lane.min, lane.span);
    if (lane.def.kind === "turtle") o.t = (o.t + dt) % TURTLE_CYCLE_S;
  }
}

export function turtleState(o: LaneObject): TurtleState {
  if (o.t < TURTLE_SURFACE_S) return "up";
  if (o.t < TURTLE_SURFACE_S + TURTLE_WARN_S) return "warn";
  return "down";
}
