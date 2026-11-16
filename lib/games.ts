// Tipos y utilidades de catálogo seguras para el cliente.
// Las lecturas de Supabase (getGames, getGame) viven en lib/games.server.ts.
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: AccentColor;
  best: number; // de game_stats
  plays: number; // de game_stats
}

export const CATS: ("TODOS" | Category)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

export function formatPlays(n: number): string {
  if (n < 1000) return String(n);
  const k = (Math.round(n / 100) / 10).toFixed(1).replace(".", ",");
  return `${k.replace(/,0$/, "")}K`;
}
