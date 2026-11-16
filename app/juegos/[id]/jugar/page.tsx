import { Suspense } from "react";
import { notFound, unstable_rethrow } from "next/navigation";
import { DataError } from "@/components/data-error";
import { GamePlayer } from "@/components/game-player";
import type { Game } from "@/lib/games";
import { getGame } from "@/lib/games.server";

async function PlayData({
  params,
}: {
  params: PageProps<"/juegos/[id]/jugar">["params"];
}) {
  const { id } = await params;
  let game: Game | null;
  try {
    game = await getGame(id);
  } catch (e) {
    unstable_rethrow(e);
    return <DataError />;
  }
  if (!game) notFound();

  return <GamePlayer game={game} />;
}

export default function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
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
      <PlayData params={params} />
    </Suspense>
  );
}
