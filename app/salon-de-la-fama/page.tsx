import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { DataError } from "@/components/data-error";
import { HallOfFame } from "@/components/hall-of-fame";
import type { Game } from "@/lib/games";
import { getGames } from "@/lib/games.server";
import { getTopScores } from "@/lib/scores.server";

async function HallData() {
  let games: Game[];
  try {
    games = await getGames();
  } catch (e) {
    unstable_rethrow(e);
    return <DataError />;
  }
  if (games.length === 0) return <DataError />;

  // Un fallo del ranking de un juego no tumba la página: null → error en su tab.
  const entries = await Promise.all(
    games.map(async (g) => {
      try {
        return [g.id, await getTopScores(g.id, 12)] as const;
      } catch (e) {
        unstable_rethrow(e);
        return [g.id, null] as const;
      }
    }),
  );
  return <HallOfFame games={games} scores={Object.fromEntries(entries)} />;
}

export default function SalonDeLaFamaPage() {
  return (
    <Suspense
      fallback={
        <div
          className="pixel"
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          CARGANDO…
        </div>
      }
    >
      <HallData />
    </Suspense>
  );
}
