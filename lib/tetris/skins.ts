import {
  NEON_COLORS,
  PASTEL_COLORS,
  PIXEL_COLORS,
  RETRO_COLORS,
} from "./constants";
import type { SkinName } from "./types";
import { roundRectPath } from "./utils";

export interface Skin {
  label: string;
  colors: (string | null)[]; // índice = tipo de pieza
  bg: string | null; // fondo del canvas; null = transparente
  grid: string | null; // color de rejilla; null = GRID_COLOR por defecto
  glow: number; // shadowBlur del bloque (px); > 0 = se cachea como sprite
  // dibuja un bloque en píxeles
  draw(
    c: CanvasRenderingContext2D,
    px: number,
    py: number,
    s: number,
    color: string,
  ): void;
}

const NEON_GLOW = 12;

export const SKINS: Record<SkinName, Skin> = {
  retro: {
    label: "Retro",
    colors: RETRO_COLORS,
    bg: null,
    grid: null,
    glow: 0,
    draw(c, px, py, s, color) {
      c.fillStyle = color;
      c.fillRect(px + 1, py + 1, s - 2, s - 2);
      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fillRect(px + 1, py + 1, s - 2, 4);
    },
  },
  neon: {
    label: "Neon",
    colors: NEON_COLORS,
    bg: "#000000",
    grid: "#14141f",
    glow: NEON_GLOW,
    draw(c, px, py, s, color) {
      c.save();
      c.shadowColor = color;
      c.shadowBlur = NEON_GLOW;
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(px + 3, py + 3, s - 6, s - 6);
      c.fillStyle = color;
      c.globalAlpha *= 0.35;
      c.fillRect(px + 3, py + 3, s - 6, s - 6);
      c.restore();
    },
  },
  pastel: {
    label: "Pastel",
    colors: PASTEL_COLORS,
    bg: null,
    grid: null,
    glow: 0,
    draw(c, px, py, s, color) {
      roundRectPath(c, px + 1.5, py + 1.5, s - 3, s - 3, s * 0.3);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.7)";
      c.lineWidth = 1.5;
      c.stroke();
    },
  },
  pixel: {
    label: "Pixel art",
    colors: PIXEL_COLORS,
    bg: null,
    grid: null,
    glow: 0,
    draw(c, px, py, s, color) {
      const u = Math.max(2, Math.floor(s / 6)); // "pixel" de la textura
      c.fillStyle = color;
      c.fillRect(px, py, s, s);
      // textura: tablero de ajedrez sutil
      c.fillStyle = "rgba(0,0,0,0.18)";
      for (let i = 0; i * u < s; i++)
        for (let j = 0; j * u < s; j++)
          if ((i + j) % 2)
            c.fillRect(
              px + i * u,
              py + j * u,
              Math.min(u, s - i * u),
              Math.min(u, s - j * u),
            );
      // bisel pixelado
      c.fillStyle = "rgba(255,255,255,0.55)";
      c.fillRect(px, py, s, u);
      c.fillRect(px, py, u, s);
      c.fillStyle = "rgba(0,0,0,0.45)";
      c.fillRect(px, py + s - u, s, u);
      c.fillRect(px + s - u, py, u, s);
    },
  },
};

export const DEFAULT_SKIN: SkinName = "retro";
