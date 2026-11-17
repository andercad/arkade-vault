import { CLASSIC_COLORS, NEON_COLORS, RETRO_COLORS } from "./constants";
import type { SkinName } from "./types";

export interface SkinColors {
  ship: string;
  asteroid: string;
  bullet: string;
  particle: string; // "r,g,b" (se le añade alpha)
  powerup: string;
  flame: string;
  hud: string;
  hudAccent: string;
}

// "line": contorno · "solid": relleno · "shape": figura (contorno o relleno+contorno según skin)
export type PaintMode = "line" | "solid" | "shape";

export interface Skin {
  label: string;
  colors: SkinColors;
  bg: string | null; // null = negro vectorial por defecto del motor
  glow: number; // shadowBlur; 0 = sin glow
  // pinta el path actual del contexto
  paint(
    c: CanvasRenderingContext2D,
    color: string,
    mode: PaintMode,
    width?: number,
  ): void;
}

export const SKINS: Record<SkinName, Skin> = {
  classic: {
    label: "Classic",
    colors: CLASSIC_COLORS,
    bg: null,
    glow: 0,
    paint(c, color, mode, width = 1.5) {
      if (mode === "solid") {
        c.fillStyle = color;
        c.fill();
      } else {
        c.strokeStyle = color;
        c.lineWidth = width;
        c.stroke();
      }
    },
  },
  retro: {
    label: "Retro",
    colors: RETRO_COLORS,
    bg: null,
    glow: 0,
    paint(c, color, mode, width = 1.5) {
      if (mode !== "line") {
        c.fillStyle = color;
        c.fill();
      }
      c.strokeStyle = mode === "line" ? color : "rgba(255,255,255,0.45)";
      c.lineWidth = mode === "line" ? width + 0.5 : width + 1;
      c.stroke();
    },
  },
  neon: {
    label: "Neon",
    colors: NEON_COLORS,
    bg: "#000000",
    glow: 12,
    paint(c, color, mode, width = 1.5) {
      c.save();
      c.shadowColor = color;
      c.shadowBlur = 12;
      c.strokeStyle = color;
      c.lineWidth = width + 0.5;
      c.stroke();
      if (mode !== "line") {
        c.fillStyle = color;
        c.globalAlpha *= mode === "solid" ? 1 : 0.18;
        c.fill();
      }
      c.restore();
    },
  },
};

export const DEFAULT_SKIN: SkinName = "classic";
