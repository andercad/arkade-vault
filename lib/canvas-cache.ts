// Cachés de canvas compartidas por los motores (SPEC 14): evitan repintar
// cada frame fondos estáticos y objetos con `shadowBlur` (caro en GPU/raster).

// Capa estática: se pinta en un canvas offscreen y se vuelca con drawImage.
// Solo se repinta si cambia `key` (p. ej. skin + estado relevante).
export interface LayerCache {
  draw(
    c: CanvasRenderingContext2D,
    key: string,
    paint: (c: CanvasRenderingContext2D) => void,
  ): void;
  clear(): void;
}

// Sprite con glow: canvas offscreen con margen `pad` (2 × blur) alrededor del
// objeto. `paint` dibuja el objeto en (0,0)-(w,h); el margen ya está aplicado.
// Se vuelca en (x - pad, y - pad).
export interface GlowSprite {
  canvas: HTMLCanvasElement;
  pad: number;
}

export interface SpriteCache {
  get(
    key: string,
    w: number,
    h: number,
    pad: number,
    paint: (c: CanvasRenderingContext2D) => void,
  ): GlowSprite;
  clear(): void;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  return canvas;
}

export function createLayerCache(): LayerCache {
  let layer: HTMLCanvasElement | null = null;
  let layerKey = "";

  return {
    draw(c, key, paint) {
      const { width, height } = c.canvas;
      if (!layer || layer.width !== width || layer.height !== height) {
        layer = makeCanvas(width, height);
        layerKey = "";
      }
      if (layerKey !== key) {
        const lc = layer.getContext("2d")!;
        lc.clearRect(0, 0, layer.width, layer.height);
        lc.save();
        paint(lc);
        lc.restore();
        layerKey = key;
      }
      c.drawImage(layer, 0, 0);
    },
    clear() {
      layer = null;
      layerKey = "";
    },
  };
}

export function createSpriteCache(): SpriteCache {
  const sprites = new Map<string, GlowSprite>();

  return {
    get(key, w, h, pad, paint) {
      const hit = sprites.get(key);
      if (hit) return hit;
      const canvas = makeCanvas(w + pad * 2, h + pad * 2);
      const sc = canvas.getContext("2d")!;
      sc.translate(pad, pad);
      paint(sc);
      const sprite = { canvas, pad };
      sprites.set(key, sprite);
      return sprite;
    },
    clear() {
      sprites.clear();
    },
  };
}
