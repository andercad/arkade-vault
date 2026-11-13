import { Suspense } from "react";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { DataError } from "@/components/data-error";
import { Leaderboard } from "@/components/leaderboard";
import { formatPlays, type Game } from "@/lib/games";
import { getGame } from "@/lib/games.server";
import type { ScoreRow } from "@/lib/scores";
import { getTopScores } from "@/lib/scores.server";

export default function GameDetailPage({ params }: PageProps<"/juegos/[id]">) {
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
      <GameDetail params={params} />
    </Suspense>
  );
}

async function GameDetail({
  params,
}: {
  params: PageProps<"/juegos/[id]">["params"];
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

  // Un fallo del ranking no tumba la ficha: el Leaderboard pinta su propio error.
  let scores: ScoreRow[] | null;
  try {
    scores = await getTopScores(game.id, 10);
  } catch (e) {
    unstable_rethrow(e);
    scores = null;
  }

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{formatPlays(game.plays)}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/juegos" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard rows={scores} playHref={`/juegos/${game.id}/jugar`} />
      </aside>
    </div>
  );
}
