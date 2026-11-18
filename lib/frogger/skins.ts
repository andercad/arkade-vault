import {
  CLASSIC_COLORS,
  NEON_COLORS,
  RETRO_COLORS,
  type FroggerPalette,
} from "./constants";
import type { SkinName } from "./types";

export interface Skin {
  label: string;
  colors: FroggerPalette;
  bg: string | null; // fondo del canvas; null = transparente (usa colors.bg)
  highlight: boolean; // línea de luz de 4px en el tope de los bloques (retro)
  glow: number; // shadowBlur de los objetos; 0 = sin glow (neon)
}

export const SKINS: Record<SkinName, Skin> = {
  classic: {
    label: "Classic",
    colors: CLASSIC_COLORS,
    bg: null,
    highlight: false,
    glow: 0,
  },
  retro: {
    label: "Retro",
    colors: RETRO_COLORS,
    bg: null,
    highlight: true,
    glow: 0,
  },
  neon: {
    label: "Neon",
    colors: NEON_COLORS,
    bg: "#000000",
    highlight: false,
    glow: 12,
  },
};

export const DEFAULT_SKIN: SkinName = "classic";
