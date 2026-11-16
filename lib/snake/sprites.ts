import { CELL, SPRITESHEET_SRC } from "./constants";
import type { Cell } from "./types";

export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// Portado de references/source-assets/snake-assets/sprites.js:23-44.
// Fila de pixel art de fruits.png (y = 136, alto 160).
function fruit(sx: number, sw: number): Frame {
  return { sx, sy: 136, sw, sh: 160 };
}

export const FRUITS: Record<string, Frame> = {
  banana: fruit(34, 110),
  orange: fruit(186, 150),
  grape: fruit(378, 110),
  garlic: fruit(540, 130),
  eggplant: fruit(712, 130),
  strawberry: fruit(894, 110),
  cherry: fruit(1066, 110),
  carrot: fruit(1228, 130),
  mushroom: fruit(1400, 130),
  broccoli: fruit(1582, 110),
  watermelon: fruit(1734, 150),
  pepper: fruit(1906, 150),
  kiwi: fruit(2068, 170),
  lemon: fruit(2250, 140),
  peach: fruit(2432, 130),
  peanut: fruit(2604, 130),
  apple: fruit(2786, 110),
  tomato: fruit(2948, 130),
  berries: fruit(3110, 150),
  grapes2: fruit(3302, 110),
  pineapple: fruit(3454, 150),
  melon: fruit(3637, 130),
};

export const FRUIT_KEYS = Object.keys(FRUITS);

// Carga la imagen del spritesheet.
// Devuelve una función de cancelación: tras cancelar no se invoca ningún callback.
export function loadSpritesheet(
  onLoad: (sheet: CanvasImageSource) => void,
  onError: () => void,
): () => void {
  let cancelled = false;
  const img = new Image();
  img.onload = () => {
    if (cancelled) return;
    onLoad(img);
  };
  img.onerror = () => {
    if (cancelled) return;
    console.error("Failed to load snake spritesheet");
    onError();
  };
  img.src = SPRITESHEET_SRC;
  return () => {
    cancelled = true;
    img.onload = null;
    img.onerror = null;
  };
}

// Altura de una celda y ancho proporcional, centrado en la celda.
// Sin `sheet` (imagen fallida) se dibuja un círculo de color.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource | null,
  key: string,
  cell: Cell,
): void {
  const cx = cell.col * CELL + CELL / 2;
  const cy = cell.row * CELL + CELL / 2;
  const frame = FRUITS[key];
  if (!sheet || !frame) {
    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.35, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const dh = CELL;
  const dw = (frame.sw / frame.sh) * dh;
  ctx.drawImage(
    sheet,
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    cx - dw / 2,
    cy - dh / 2,
    dw,
    dh,
  );
}
