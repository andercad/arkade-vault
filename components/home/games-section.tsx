import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { DataError } from "@/components/data-error";
import type { Game } from "@/lib/games";
import { getGames } from "@/lib/games.server";
import { MiniCard } from "@/components/home/mini-card";
import { Reveal } from "@/components/home/reveal";

async function GamesRail() {
  let games: Game[];
  try {
    games = await getGames();
  } catch (e) {
    unstable_rethrow(e);
    return <DataError />;
  }
  return (
    <div className="mini-rail">
      {games.slice(0, 6).map((g) => (
        <MiniCard key={g.id} game={g} />
      ))}
    </div>
  );
}

export function GamesSection() {
  return (
    <Reveal className="home-section">
      <div className="section-head">
        <div className="kicker pixel neon-cyan">{"// 02"}</div>
        <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
        <div className="section-rule"></div>
      </div>
      <Suspense fallback={<div className="mini-rail" />}>
        <GamesRail />
      </Suspense>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/juegos" className="btn lg">
          VER TODOS LOS JUEGOS →
        </Link>
      </div>
    </Reveal>
  );
}
