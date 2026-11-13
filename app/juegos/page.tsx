import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { DataError } from "@/components/data-error";
import { Library } from "@/components/library";
import type { DbGame } from "@/lib/games";
import { getGames } from "@/lib/games.server";

async function LibraryData() {
  let games: DbGame[];
  try {
    games = await getGames();
  } catch (e) {
    unstable_rethrow(e);
    return <DataError />;
  }
  return <Library games={games} />;
}

export default function JuegosPage() {
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
      <LibraryData />
    </Suspense>
  );
}
