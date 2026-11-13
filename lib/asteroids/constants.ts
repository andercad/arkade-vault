export const W = 800;
export const H = 600;

// Indexados por tamaño de asteroide (1, 2, 3); el índice 0 no se usa.
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const; // velocidad base por tamaño
export const POINTS = [0, 100, 50, 20] as const; // puntos por tamaño

// Power-up: disparo triple
export const POWERUP_TTL = 8; // s antes de desaparecer si no se recoge
export const TRIPLE_DURATION = 5; // s de efecto
export const SPREAD = 0.2; // rad entre balas del abanico
