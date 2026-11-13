// Lecturas de catálogo desde Supabase (solo servidor: usa cookies()).
// Los tipos, CATS y formatPlays viven en lib/games.ts para poder usarse en el cliente.
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { AccentColor, Category, Game } from "@/lib/games";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type StatsRow = Database["public"]["Views"]["game_stats"]["Row"];

function toGame(row: GameRow, stats?: StatsRow): Game {
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

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("game_stats").select("*"),
  ]);
  if (games.error || stats.error)
    throw new Error("No se pudo leer el catálogo");
  const byId = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((g) => toGame(g, byId.get(g.id)));
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const [game, stats] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("game_stats").select("*").eq("game_id", id).maybeSingle(),
  ]);
  if (game.error || stats.error) throw new Error("No se pudo leer el juego");
  return game.data ? toGame(game.data, stats.data ?? undefined) : null;
}
