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

// TEMPORAL: se elimina en el paso 9 al pasar ficha y Salón a getTopScores.
const PLAYERS = [
  "PX_KAI", "NEONFOX", "Z3R0COOL", "M00NRYU", "VAULT_07", "GLITCHA",
  "ATARI_KID", "CYBER_LU", "MAGENTA88", "SCANLINE", "BIT_LORD", "ARKADYA",
  "DROID_X", "RGB_QUEEN", "PIXEL_DAD", "RETROVIRA", "VECTORX", "JOY_STK",
];

export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);
    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({
      rank: i + 1,
      name,
      score: Math.max(score, 1000),
      date: `${day}/${mon}/2026`,
    });
  }
  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
