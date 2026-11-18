import { CLASSIC_COLORS, NEON_COLORS, RETRO_COLORS } from "./constants";
import { EXPLOSION_FRAMES, drawFrame, drawSprite } from "./sprites";
import type { SkinName } from "./types";

type Ctx = CanvasRenderingContext2D;

export interface Skin {
  label: string;
  colors: Record<string, string>; // color de bloque -> color del skin
  bg: string | null; // fondo del canvas; null = fondo por defecto (CLASSIC_BG)
  text: string; // color del HUD del canvas
  glow: number; // mayor shadowBlur de ladrillo/pala/bola (px); > 0 = se cachean como sprites
  drawBrick(
    c: Ctx,
    sheet: CanvasImageSource,
    color: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void;
  drawExplosion(
    c: Ctx,
    sheet: CanvasImageSource,
    color: string,
    t: number, // 0..1
    x: number,
    y: number,
    w: number,
    h: number,
  ): void;
  drawPaddle(
    c: Ctx,
    sheet: CanvasImageSource,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void;
  drawBall(
    c: Ctx,
    sheet: CanvasImageSource,
    x: number,
    y: number,
    size: number,
  ): void;
}

// Explosión simple (retro/neon): destello que se desvanece.
function flash(
  c: Ctx,
  fill: string,
  t: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.save();
  c.globalAlpha = Math.max(0, 1 - t);
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
  c.restore();
}

export const SKINS: Record<SkinName, Skin> = {
  classic: {
    label: "Classic",
    colors: CLASSIC_COLORS,
    bg: null,
    text: "#ffffff",
    glow: 0,
    drawBrick(c, sheet, color, x, y, w, h) {
      drawSprite(c, sheet, `block_${color}`, x, y, w, h);
    },
    drawExplosion(c, sheet, color, t, x, y, w, h) {
      const frames = EXPLOSION_FRAMES[color];
      if (!frames) return;
      drawFrame(c, sheet, frames[Math.floor(t * frames.length)], x, y, w, h);
    },
    drawPaddle(c, sheet, x, y, w, h) {
      drawSprite(c, sheet, "paddle", x, y, w, h);
    },
    drawBall(c, sheet, x, y, size) {
      drawSprite(c, sheet, "ball", x, y, size, size);
    },
  },
  retro: {
    label: "Retro",
    colors: RETRO_COLORS,
    bg: null,
    text: "#f2d45c",
    glow: 0,
    drawBrick(c, _sheet, color, x, y, w, h) {
      c.fillStyle = RETRO_COLORS[color] ?? "#ffffff";
      c.fillRect(x + 1, y + 1, w - 2, h - 2);
      c.fillStyle = "rgba(255,255,255,0.25)";
      c.fillRect(x + 1, y + 1, w - 2, 4);
    },
    drawExplosion(c, _sheet, color, t, x, y, w, h) {
      flash(c, "#ffffff", t, x + 1, y + 1, w - 2, h - 2);
    },
    drawPaddle(c, _sheet, x, y, w, h) {
      c.fillStyle = "#e6e6e6";
      c.fillRect(x, y, w, h);
      c.fillStyle = "rgba(255,255,255,0.5)";
      c.fillRect(x, y, w, 4);
    },
    drawBall(c, _sheet, x, y, size) {
      c.fillStyle = "#f5f5f5";
      c.fillRect(x, y, size, size);
    },
  },
  neon: {
    label: "Neon",
    colors: NEON_COLORS,
    bg: "#000000",
    text: "#00f0ff",
    glow: 14,
    drawBrick(c, _sheet, color, x, y, w, h) {
      const col = NEON_COLORS[color] ?? "#ffffff";
      c.save();
      c.shadowColor = col;
      c.shadowBlur = 12;
      c.strokeStyle = col;
      c.lineWidth = 2;
      c.strokeRect(x + 2, y + 2, w - 4, h - 4);
      c.globalAlpha *= 0.3;
      c.fillStyle = col;
      c.fillRect(x + 2, y + 2, w - 4, h - 4);
      c.restore();
    },
    drawExplosion(c, _sheet, color, t, x, y, w, h) {
      const col = NEON_COLORS[color] ?? "#ffffff";
      c.save();
      c.shadowColor = col;
      c.shadowBlur = 16;
      c.globalAlpha = Math.max(0, 1 - t);
      c.strokeStyle = col;
      c.lineWidth = 2;
      const g = t * 6;
      c.strokeRect(x + 2 - g, y + 2 - g, w - 4 + g * 2, h - 4 + g * 2);
      c.restore();
    },
    drawPaddle(c, _sheet, x, y, w, h) {
      c.save();
      c.shadowColor = "#00f0ff";
      c.shadowBlur = 14;
      c.strokeStyle = "#00f0ff";
      c.lineWidth = 2;
      c.strokeRect(x + 1, y + 1, w - 2, h - 2);
      c.globalAlpha *= 0.35;
      c.fillStyle = "#00f0ff";
      c.fillRect(x + 1, y + 1, w - 2, h - 2);
      c.restore();
    },
    drawBall(c, _sheet, x, y, size) {
      c.save();
      c.shadowColor = "#ffffff";
      c.shadowBlur = 14;
      c.fillStyle = "#ffffff";
      c.fillRect(x, y, size, size);
      c.restore();
    },
  },
};

export const DEFAULT_SKIN: SkinName = "classic";
