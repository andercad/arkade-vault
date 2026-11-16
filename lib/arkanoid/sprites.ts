import { SPRITESHEET_SRC } from "./constants";

export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// Cuatro frames de explosión por color (fila fija, columnas 256..352).
function explosion(sy: number): Frame[] {
  return [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
}

// `gray` del original no se usa en los 5 niveles (queda fuera de alcance).
export const EXPLOSION_FRAMES: Record<string, Frame[]> = {
  red: explosion(176),
  cyan: explosion(192),
  green: explosion(208),
  magenta: explosion(224),
  yellow: explosion(240),
  hotpink: explosion(256),
};

export const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  } as Record<string, Frame>,
};

// Carga la imagen del spritesheet y la copia a un canvas auxiliar (como el original).
// Devuelve una función de cancelación: tras cancelar no se invoca ningún callback.
export function loadSpritesheet(
  onLoad: (sheet: CanvasImageSource) => void,
  onError: () => void,
): () => void {
  let cancelled = false;
  const raw = new Image();
  raw.onload = () => {
    if (cancelled) return;
    const oc = document.createElement("canvas");
    oc.width = raw.width;
    oc.height = raw.height;
    oc.getContext("2d")?.drawImage(raw, 0, 0);
    onLoad(oc);
  };
  raw.onerror = () => {
    if (cancelled) return;
    console.error("Failed to load spritesheet");
    onError();
  };
  raw.src = SPRITESHEET_SRC;
  return () => {
    cancelled = true;
    raw.onload = null;
    raw.onerror = null;
  };
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export type SpriteName = "paddle" | "ball" | `block_${string}`;

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  name: SpriteName,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const sp = name.startsWith("block_")
    ? SPRITES.blocks[name.slice(6)]
    : SPRITES[name as "paddle" | "ball"];
  if (!sp) return;
  drawFrame(ctx, sheet, sp, x, y, w, h);
}
