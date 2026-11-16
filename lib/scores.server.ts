// Lecturas de puntuaciones desde Supabase (solo servidor: usa cookies()).
// Los tipos y submitScore (cliente) viven en lib/scores.ts.
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AccentColor } from "@/lib/games";
import type { RecentScore, ScoreRow } from "@/lib/scores";

// dd/mm/aaaa en es-ES con zona UTC fija para evitar hydration mismatch.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Tiempo relativo calculado en servidor (evita hydration mismatch).
export function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// Ranking: score desc, created_at asc; rank consecutivo al leer (sin empates).
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error("No se pudo leer el ranking");
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}

export async function getRecentScores(limit: number): Promise<RecentScore[]> {
  const supabase = await createClient();
  const [scores, games] = await Promise.all([
    supabase
      .from("scores")
      .select("game_id, player_name, score, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("games").select("id, title, color"),
  ]);
  if (scores.error || games.error)
    throw new Error("No se pudo leer la actividad");
  const byId = new Map(games.data.map((g) => [g.id, g]));
  return scores.data.map((r) => {
    const g = byId.get(r.game_id);
    return {
      player: r.player_name,
      gameTitle: g?.title ?? r.game_id.toUpperCase(),
      color: (g?.color ?? "cyan") as AccentColor,
      score: r.score,
      createdAt: r.created_at,
    };
  });
}

export async function getTopLast24h(
  limit: number,
): Promise<{ player: string; score: number }[]> {
  await connection(); // la hora actual solo se lee en tiempo de petición
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score")
    .gte("created_at", since)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error("No se pudo leer el ranking de hoy");
  return data.map((r) => ({ player: r.player_name, score: r.score }));
}
