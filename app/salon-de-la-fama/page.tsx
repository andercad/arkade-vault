import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { DataError } from "@/components/data-error";
import { HallOfFame } from "@/components/hall-of-fame";
import type { Game } from "@/lib/games";
import { getGames } from "@/lib/games.server";

async function HallData() {
  let games: Game[];
  try {
    games = await getGames();
  } catch (e) {
    unstable_rethrow(e);
    return <DataError />;
  }
  if (games.length === 0) return <DataError />;
  return <HallOfFame games={games} />;
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
