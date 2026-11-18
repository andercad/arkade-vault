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
