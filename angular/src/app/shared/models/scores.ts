import type { AccentColor } from '@/lib/games';

/** Puntuación reciente para la actividad de la home; `ago` ("hace 5 min") lo calcula el servidor. */
export interface RecentScoreView {
  player: string;
  gameTitle: string;
  color: AccentColor;
  score: number;
  ago: string;
}

/** Fila del top de las últimas 24 h. */
export interface TopTodayRow {
  player: string;
  score: number;
}
