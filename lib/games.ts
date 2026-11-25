// Tipos y utilidades de catálogo seguras para el cliente.
// Las lecturas de Supabase (getGames, getGame) viven en lib/games.server.ts.
import type { Database } from "@/lib/supabase/database.types";

export const CATEGORIES = [
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
  "RACING",
  "FIGHTING",
  "PLATFORMER",
  "MAZE",
  "RHYTHM",
  "SPORTS",
  "STRATEGY",
] as const;
export type Category = (typeof CATEGORIES)[number];
export type AccentColor =
  | "green"
  | "cyan"
  | "magenta"
  | "yellow"
  | "orange"
  | "violet"
  | "red"
  | "blue"
  | "lime"
  | "pink"
  | "silver";

// Fuente única categoría → color (SPEC 15). Debe coincidir con games_cat_color_check.
export const CATEGORY_COLOR: Record<Category, AccentColor> = {
  ARCADE: "green",
  PUZZLE: "cyan",
  SHOOTER: "magenta",
  VERSUS: "yellow",
  RACING: "orange",
  FIGHTING: "red",
  PLATFORMER: "violet",
  MAZE: "blue",
  RHYTHM: "pink",
  SPORTS: "lime",
  STRATEGY: "silver",
};

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

export function formatPlays(n: number): string {
  if (n < 1000) return String(n);
  const k = (Math.round(n / 100) / 10).toFixed(1).replace(".", ",");
  return `${k.replace(/,0$/, "")}K`;
}

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type StatsRow = Database["public"]["Views"]["game_stats"]["Row"];

// Fila de BD (+ estadísticas) → Game. Pura: la usan games.server.ts (Next) y el BFF de Angular.
export function toGame(row: GameRow, stats?: StatsRow): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as Category,
    cover: row.cover,
    color: row.color as AccentColor,
    best: stats?.best ?? 0,
    plays: stats?.plays ?? 0,
  };
}
