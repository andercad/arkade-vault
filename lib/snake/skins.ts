import { CELL, CLASSIC_COLORS, NEON_COLORS, RETRO_COLORS } from "./constants";
import type { Cell, SkinName } from "./types";

export interface Skin {
  label: string;
  colors: { head: string; body: string };
  bg: string | null; // fondo del canvas; null = transparente
  grid: string; // color de rejilla
  glowFruit: string | null; // glow alrededor de la fruta; null = sin glow
  glowSegment: number; // shadowBlur de los segmentos (px); 0 = sin glow
  // dibuja un segmento de la serpiente (coordenadas de tablero)
  drawSegment(
    c: CanvasRenderingContext2D,
    cell: Cell,
    color: string,
    isHead: boolean,
  ): void;
}

const NEON_GLOW = 12;

export const SKINS: Record<SkinName, Skin> = {
  classic: {
    label: "Classic",
    colors: CLASSIC_COLORS,
    bg: null,
    grid: "rgba(255, 255, 255, 0.05)",
    glowFruit: null,
    glowSegment: 0,
    drawSegment(c, cell, color) {
      const pad = 2;
      c.fillStyle = color;
      c.beginPath();
      c.roundRect(
        cell.col * CELL + pad,
        cell.row * CELL + pad,
        CELL - pad * 2,
        CELL - pad * 2,
        7,
      );
      c.fill();
    },
  },
  retro: {
    label: "Retro",
    colors: RETRO_COLORS,
    bg: null,
    grid: "rgba(255, 255, 255, 0.06)",
    glowFruit: null,
    glowSegment: 0,
    drawSegment(c, cell, color) {
      const x = cell.col * CELL + 1;
      const y = cell.row * CELL + 1;
      c.fillStyle = color;
      c.fillRect(x, y, CELL - 2, CELL - 2);
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.fillRect(x, y, CELL - 2, 4);
    },
  },
  neon: {
    label: "Neon",
    colors: NEON_COLORS,
    bg: "#000000",
    grid: "#14141f",
    glowFruit: "#ffffff",
    glowSegment: NEON_GLOW,
    drawSegment(c, cell, color) {
      const x = cell.col * CELL + 3;
      const y = cell.row * CELL + 3;
      const s = CELL - 6;
      c.save();
      c.shadowColor = color;
      c.shadowBlur = NEON_GLOW;
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(x, y, s, s);
      c.fillStyle = color;
      c.globalAlpha *= 0.35;
      c.fillRect(x, y, s, s);
      c.restore();
    },
  },
};

export const DEFAULT_SKIN: SkinName = "classic";
