import {
  CELL,
  COLS,
  DEATH_MS,
  H,
  HOME_COLS,
  HOME_ROW,
  HUD_H,
  JUMP_MS,
  MEDIAN_ROW,
  RIVER_FIRST_ROW,
  RIVER_LAST_ROW,
  ROAD_FIRST_ROW,
  ROAD_LAST_ROW,
  START_ROW,
  TIME_LIMIT,
  W,
} from "./constants";
import { createLayerCache, createSpriteCache } from "@/lib/canvas-cache";
import { frogDrawPos, isJumping, type Frog } from "./frog";
import { turtleState, type LaneObject, type LaneState } from "./lanes";
import { DEFAULT_SKIN, SKINS, type Skin } from "./skins";
import type { GameState } from "./state";
import type { Direction } from "./types";

// Skin activo: se fija en cada drawGame (el dibujo es síncrono).
let skin: Skin = SKINS[DEFAULT_SKIN];
let COLORS = skin.colors;

// Cachés (SPEC 14): fondo estático y sprites con glow (neon). Se limpian con
// clearDrawCache() al cambiar de skin y en destroy.
const background = createLayerCache();
const hudLayer = createLayerCache();
const sprites = createSpriteCache();

export function clearDrawCache() {
  background.clear();
  hudLayer.clear();
  sprites.clear();
}

// Vuelca un objeto con glow desde su sprite; `paint` lo dibuja en (0,0)-(w,h).
function blit(
  c: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: (c: CanvasRenderingContext2D) => void,
) {
  const sp = sprites.get(
    `${skin.label}:${key}:${w}x${h}`,
    w,
    h,
    skin.glow * 2,
    paint,
  );
  c.drawImage(sp.canvas, x - sp.pad, y - sp.pad);
}

// Activa el glow del skin (neon) con el color dado; requiere c.save() previo.
function glow(c: CanvasRenderingContext2D, color: string) {
  if (skin.glow > 0) {
    c.shadowColor = color;
    c.shadowBlur = skin.glow;
  }
}

// Línea de luz de 4px al tope de un bloque (retro).
function highlight(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
) {
  if (!skin.highlight) return;
  c.fillStyle = "rgba(255, 255, 255, 0.28)";
  c.fillRect(x, y, w, 4);
}

const ANGLES: Record<Direction, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// Rana mirando hacia arriba, centrada en (cx, cy) y escalada; se rota por dir.
function drawFrogSprite(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: Direction,
  scale: number,
  body: string,
  dead: boolean,
) {
  c.save();
  c.translate(cx, cy);
  c.rotate(ANGLES[dir]);
  c.scale(scale, scale);
  const dark = dead ? "rgba(0,0,0,0.35)" : COLORS.frogDark;

  // Patas
  c.fillStyle = dark;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(sx * 12, 9, 5, 7, sx * 0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(sx * 11, -8, 4, 5, -sx * 0.5, 0, Math.PI * 2);
    c.fill();
  }
  // Cuerpo
  c.fillStyle = body;
  c.beginPath();
  c.ellipse(0, 1, 10, 13, 0, 0, Math.PI * 2);
  c.fill();
  // Ojos
  if (dead) {
    c.strokeStyle = "#0b0b14";
    c.lineWidth = 1.6;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(sx * 6 - 2, -10);
      c.lineTo(sx * 6 + 2, -6);
      c.moveTo(sx * 6 + 2, -10);
      c.lineTo(sx * 6 - 2, -6);
      c.stroke();
    }
  } else {
    for (const sx of [-1, 1]) {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(sx * 6, -9, 3.6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#0b0b14";
      c.beginPath();
      c.arc(sx * 6, -10, 1.6, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

function rowY(row: number): number {
  return row * CELL;
}

// ── Fondo del tablero (coordenadas con origen bajo el HUD) ──────────────────
function drawBackground(c: CanvasRenderingContext2D, filled: boolean[]) {
  // Casas
  c.fillStyle = COLORS.wall;
  c.fillRect(0, rowY(HOME_ROW), W, CELL);
  c.fillStyle = COLORS.wallEdge;
  for (let col = 0; col < COLS; col++) {
    if (HOME_COLS.includes(col)) continue;
    c.fillRect(col * CELL + 2, rowY(HOME_ROW) + 2, CELL - 4, CELL - 4);
  }
  HOME_COLS.forEach((col, i) => {
    const x = col * CELL;
    c.fillStyle = COLORS.water;
    c.fillRect(x, rowY(HOME_ROW), CELL, CELL);
    c.strokeStyle = COLORS.safe;
    c.lineWidth = 2;
    c.strokeRect(x + 1, rowY(HOME_ROW) + 1, CELL - 2, CELL - 2);
    if (filled[i]) {
      drawFrogSprite(
        c,
        x + CELL / 2,
        rowY(HOME_ROW) + CELL / 2,
        "down",
        0.9,
        COLORS.frog,
        false,
      );
    }
  });

  // Río
  const riverY = rowY(RIVER_FIRST_ROW);
  const riverH = (RIVER_LAST_ROW - RIVER_FIRST_ROW + 1) * CELL;
  c.fillStyle = COLORS.water;
  c.fillRect(0, riverY, W, riverH);
  c.strokeStyle = COLORS.waterWave;
  c.lineWidth = 2;
  c.beginPath();
  for (let row = RIVER_FIRST_ROW; row <= RIVER_LAST_ROW; row++) {
    const y = rowY(row) + CELL * 0.8;
    for (let x = 6; x < W; x += 60) {
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 7.5, y - 5, x + 15, y);
      c.quadraticCurveTo(x + 22.5, y + 5, x + 30, y);
    }
  }
  c.stroke();

  // Mediana e inicio
  for (const row of [MEDIAN_ROW, START_ROW]) {
    c.fillStyle = COLORS.safe;
    c.fillRect(0, rowY(row), W, CELL);
    c.fillStyle = COLORS.safeEdge;
    for (let x = 8; x < W; x += 40) {
      c.fillRect(x, rowY(row) + 8, 4, 4);
      c.fillRect(x + 20, rowY(row) + 26, 4, 4);
    }
  }

  // Carretera
  const roadY = rowY(ROAD_FIRST_ROW);
  const roadH = (ROAD_LAST_ROW - ROAD_FIRST_ROW + 1) * CELL;
  c.fillStyle = COLORS.road;
  c.fillRect(0, roadY, W, roadH);
  c.strokeStyle = COLORS.roadLine;
  c.lineWidth = 2;
  c.setLineDash([14, 14]);
  c.beginPath();
  for (let row = ROAD_FIRST_ROW + 1; row <= ROAD_LAST_ROW; row++) {
    c.moveTo(0, rowY(row));
    c.lineTo(W, rowY(row));
  }
  c.stroke();
  c.setLineDash([]);

  // Retro: línea de luz en el tope de cada franja. Neon: contornos con glow.
  const bands: [number, number, string][] = [
    [HOME_ROW, 1, COLORS.wallEdge],
    [RIVER_FIRST_ROW, RIVER_LAST_ROW - RIVER_FIRST_ROW + 1, COLORS.waterWave],
    [MEDIAN_ROW, 1, COLORS.safeEdge],
    [ROAD_FIRST_ROW, ROAD_LAST_ROW - ROAD_FIRST_ROW + 1, COLORS.roadLine],
    [START_ROW, 1, COLORS.safeEdge],
  ];
  for (const [row, n, color] of bands) {
    highlight(c, 0, rowY(row), W);
    if (skin.glow > 0) {
      c.save();
      glow(c, color);
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(1, rowY(row) + 1, W - 2, n * CELL - 2);
      c.restore();
    }
  }
}

// ── Objetos ─────────────────────────────────────────────────────────────────
// Cuerpo del vehículo (la parte con glow); (x, y) = esquina sup. izq. de la celda.
function paintVehicleBody(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
) {
  c.save();
  glow(c, color);
  roundRect(c, x + 3, y + 6, w - 6, CELL - 12, 6);
  if (skin.glow > 0) {
    c.fillStyle = "#000000";
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.stroke();
    c.globalAlpha = 0.35;
  }
  c.fillStyle = color;
  c.fill();
  c.restore();
}

function drawVehicle(
  c: CanvasRenderingContext2D,
  lane: LaneState,
  o: LaneObject,
) {
  const { objLen, dir, row } = lane.def;
  const x = o.x * CELL;
  const y = rowY(row);
  const w = o.len * CELL;
  const idx = row % COLORS.cars.length;
  const truck = objLen > 1;
  const color = truck ? COLORS.trucks[idx] : COLORS.cars[idx];

  // Vehículo completo cacheado (cuerpo, cabina y faros), con o sin glow.
  blit(c, `veh:${color}:${dir}:${o.len}`, x, y, w, CELL, (sc) => {
    paintVehicleBody(sc, 0, 0, w, color);
    highlight(sc, 5, 7, w - 10);
    // Cabina / parabrisas y faros hacia el sentido de la marcha
    const front = dir === 1 ? w - 3 : 3;
    sc.fillStyle = "rgba(20, 30, 60, 0.75)";
    const cabW = truck ? 10 : 12;
    sc.fillRect(dir === 1 ? front - cabW - 3 : front + 3, 10, cabW, CELL - 20);
    sc.fillStyle = "#fff6c2";
    const lightX = dir === 1 ? front - 3 : front;
    sc.fillRect(lightX, 9, 3, 5);
    sc.fillRect(lightX, CELL - 14, 3, 5);
    if (truck) {
      sc.strokeStyle = "rgba(0, 0, 0, 0.25)";
      sc.lineWidth = 1;
      sc.beginPath();
      for (let k = 1; k < o.len; k++) {
        sc.moveTo(k * CELL, 8);
        sc.lineTo(k * CELL, CELL - 8);
      }
      sc.stroke();
    }
  });
}

// Cuerpo del tronco (la parte con glow); los nudos se pintan aparte, sin glow.
function paintLogBody(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
) {
  c.save();
  glow(c, COLORS.log);
  c.fillStyle = COLORS.log;
  roundRect(c, x + 1, y + 6, w - 2, CELL - 12, 9);
  if (skin.glow > 0) c.globalAlpha = 0.35;
  c.fill();
  c.globalAlpha = 1;
  c.strokeStyle = COLORS.logEdge;
  c.lineWidth = 2;
  c.stroke();
  c.restore();
}

function drawLog(c: CanvasRenderingContext2D, lane: LaneState, o: LaneObject) {
  const x = o.x * CELL;
  const y = rowY(lane.def.row);
  const w = o.len * CELL;
  blit(c, "log", x, y, w, CELL, (sc) => {
    paintLogBody(sc, 0, 0, w);
    highlight(sc, 8, 7, w - 16);
    // Nudos: usan el trazo de la carretera (como antes).
    sc.strokeStyle = COLORS.roadLine;
    sc.lineWidth = 2;
    sc.beginPath();
    for (let k = 14; k < w - 10; k += 22) {
      sc.moveTo(k, 12);
      sc.lineTo(k + 8, 12);
      sc.moveTo(k + 6, CELL - 13);
      sc.lineTo(k + 14, CELL - 13);
    }
    sc.stroke();
  });
}

function paintTurtle(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  warn: boolean,
  dir: number,
) {
  c.save();
  glow(c, COLORS.shell);
  c.fillStyle = warn ? COLORS.shellWarn : COLORS.shell;
  c.beginPath();
  c.arc(cx, cy, 14, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = COLORS.shellEdge;
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.moveTo(cx - 8, cy);
  c.lineTo(cx + 8, cy);
  c.moveTo(cx, cy - 8);
  c.lineTo(cx, cy + 8);
  c.stroke();
  // Cabeza hacia el sentido de la marcha
  c.fillStyle = COLORS.shell;
  c.beginPath();
  c.arc(cx + dir * 15, cy, 4, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawTurtles(
  c: CanvasRenderingContext2D,
  lane: LaneState,
  o: LaneObject,
) {
  const state = turtleState(o);
  const y = rowY(lane.def.row);
  // En aviso parpadean; sumergidas solo queda un contorno tenue.
  if (state === "warn" && Math.floor(o.t * 10) % 2 === 0) return;
  for (let k = 0; k < o.len; k++) {
    const cx = (o.x + k) * CELL + CELL / 2;
    const cy = y + CELL / 2;
    if (state === "down") {
      c.strokeStyle = "rgba(255, 255, 255, 0.18)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, cy, 11, 0, Math.PI * 2);
      c.stroke();
      continue;
    }
    const warn = state === "warn";
    const dir = lane.def.dir;
    blit(
      c,
      `turtle:${warn ? "w" : "u"}:${dir}`,
      cx - CELL / 2,
      cy - CELL / 2,
      CELL,
      CELL,
      (sc) => paintTurtle(sc, CELL / 2, CELL / 2, warn, dir),
    );
  }
}

function drawLanes(c: CanvasRenderingContext2D, lanes: LaneState[]) {
  for (const lane of lanes) {
    for (const o of lane.objs) {
      if (lane.def.kind === "road") drawVehicle(c, lane, o);
      else if (lane.def.kind === "log") drawLog(c, lane, o);
      else drawTurtles(c, lane, o);
    }
  }
}

// ── Rana ────────────────────────────────────────────────────────────────────
function drawFrog(c: CanvasRenderingContext2D, frog: Frog) {
  const pos = frogDrawPos(frog);
  const cx = pos.x * CELL + CELL / 2;
  const cy = pos.row * CELL + CELL / 2;
  if (frog.dead) {
    const k = Math.min(1, frog.deathMs / DEATH_MS);
    const water = frog.cause === "water" || frog.cause === "offscreen";
    c.save();
    c.globalAlpha = 1 - k * 0.7;
    if (water) {
      c.strokeStyle = COLORS.frogDeadWater;
      c.lineWidth = 2;
      for (let r = 0; r < 2; r++) {
        c.beginPath();
        c.arc(cx, cy, 8 + k * 18 + r * 6, 0, Math.PI * 2);
        c.stroke();
      }
    }
    drawFrogSprite(
      c,
      cx,
      cy,
      frog.dir,
      1 - k * 0.2,
      water ? COLORS.frogDeadWater : COLORS.frogDeadRoad,
      true,
    );
    c.restore();
    return;
  }
  const lift = isJumping(frog)
    ? Math.sin(Math.min(1, frog.jumpMs / JUMP_MS) * Math.PI)
    : 0;
  c.save();
  glow(c, COLORS.frog);
  drawFrogSprite(c, cx, cy, frog.dir, 0.9 + lift * 0.25, COLORS.frog, false);
  c.restore();
}

// ── HUD ─────────────────────────────────────────────────────────────────────
function timeColor(ratio: number): string {
  // Verde (120°) → rojo (0°) según el tiempo restante.
  return `hsl(${Math.round(120 * ratio)}, 85%, 50%)`;
}

function drawHud(c: CanvasRenderingContext2D, s: GameState) {
  // Parte estática (texto, vidas) cacheada: solo cambia con puntos/nivel/vidas.
  hudLayer.draw(c, `${skin.label}:${s.score}:${s.level}:${s.lives}`, (lc) =>
    paintHudStatic(lc, s),
  );
  // Barra de tiempo (cambia cada frame)
  const ratio = Math.max(0, Math.min(1, s.timeLeft / TIME_LIMIT));
  const barX = 420;
  const barW = 170;
  c.fillStyle = "rgba(255, 255, 255, 0.12)";
  c.fillRect(barX, HUD_H / 2 - 6, barW, 12);
  c.fillStyle = timeColor(ratio);
  c.fillRect(barX, HUD_H / 2 - 6, barW * ratio, 12);
}

function paintHudStatic(c: CanvasRenderingContext2D, s: GameState) {
  c.fillStyle = COLORS.hud;
  c.fillRect(0, 0, W, HUD_H);
  c.strokeStyle = COLORS.hudLine;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, HUD_H - 0.5);
  c.lineTo(W, HUD_H - 0.5);
  c.stroke();

  c.font = "bold 13px monospace";
  c.textBaseline = "middle";
  c.fillStyle = COLORS.text;
  c.textAlign = "left";
  c.fillText(`PUNTOS: ${s.score}`, 10, HUD_H / 2);
  c.fillText(`NIVEL: ${s.level}`, 250, HUD_H / 2);

  // Vidas como iconos de rana
  c.fillText("VIDAS:", 130, HUD_H / 2);
  for (let i = 0; i < s.lives; i++) {
    drawFrogSprite(c, 195 + i * 11, HUD_H / 2, "up", 0.38, COLORS.frog, false);
  }

  c.fillStyle = COLORS.text;
  c.textAlign = "right";
  c.fillText("TIEMPO", 420 - 8, HUD_H / 2);
}

// Sin overlays de pausa ni game over: los dibuja el contenedor (React).
export function drawGame(
  c: CanvasRenderingContext2D,
  s: GameState,
  activeSkin: Skin = SKINS[DEFAULT_SKIN],
) {
  skin = activeSkin;
  COLORS = skin.colors;
  c.clearRect(0, 0, W, H);
  c.fillStyle = skin.bg ?? COLORS.bg;
  c.fillRect(0, 0, W, H);

  // Fondo cacheado: se repinta solo si cambia el skin o las casas llenas.
  background.draw(
    c,
    `${skin.label}:${s.filled.map((f) => (f ? 1 : 0)).join("")}`,
    (lc) => {
      lc.translate(0, HUD_H);
      drawBackground(lc, s.filled);
    },
  );

  // Los nudos de los troncos usan el trazo que dejaba el fondo (carretera).
  c.strokeStyle = COLORS.roadLine;
  c.lineWidth = 2;

  c.save();
  c.translate(0, HUD_H);
  drawLanes(c, s.lanes);
  drawFrog(c, s.frog);
  c.restore();

  drawHud(c, s);
}
