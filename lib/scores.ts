import { createClient } from "@/lib/supabase/client";
import type { AccentColor } from "@/lib/games";

// Tipos y submitScore (cliente). Las lecturas están en lib/scores.server.ts.
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface RecentScore {
  player: string;
  gameTitle: string;
  color: AccentColor;
  score: number;
  createdAt: string;
}

// Inserta una puntuación (RLS + CHECKs en BD). Devuelve false si falla.
export async function submitScore(e: {
  gameId: string;
  name: string;
  score: number;
}): Promise<boolean> {
  try {
    const { error } = await createClient()
      .from("scores")
      .insert({ game_id: e.gameId, player_name: e.name, score: e.score });
    return !error;
  } catch {
    return false;
  }
}
