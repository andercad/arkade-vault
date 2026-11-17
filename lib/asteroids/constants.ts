export const W = 800;
export const H = 600;

// Indexados por tamaño de asteroide (1, 2, 3); el índice 0 no se usa.
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const; // velocidad base por tamaño
export const POINTS = [0, 100, 50, 20] as const; // puntos por tamaño

// Paletas por skin
export const CLASSIC_COLORS = {
  ship: "#ffffff",
  asteroid: "#ffffff",
  bullet: "#ffffff",
  particle: "255,255,255",
  powerup: "#00ffff",
  flame: "rgba(255, 130, 0, 0.85)",
  hud: "#ffffff",
  hudAccent: "#00ffff",
};

export const RETRO_COLORS = {
  ship: "#7dd3fc",
  asteroid: "#c4a484",
  bullet: "#fde68a",
  particle: "253,186,116",
  powerup: "#86efac",
  flame: "#fb923c",
  hud: "#e5e7eb",
  hudAccent: "#86efac",
};

export const NEON_COLORS = {
  ship: "#00f0ff",
  asteroid: "#ff2bd6",
  bullet: "#faff00",
  particle: "57,255,20",
  powerup: "#39ff14",
  flame: "#ff6a00",
  hud: "#00f0ff",
  hudAccent: "#39ff14",
};

// Power-up: disparo triple
export const POWERUP_TTL = 8; // s antes de desaparecer si no se recoge
export const TRIPLE_DURATION = 5; // s de efecto
export const SPREAD = 0.2; // rad entre balas del abanico
