import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { DataError } from "@/components/data-error";
import { Reveal } from "@/components/home/reveal";
import { ScoreEmpty } from "@/components/score-empty";
import type { RecentScore } from "@/lib/scores";
import { getRecentScores, getTopLast24h, timeAgo } from "@/lib/scores.server";

async function RecentCard() {
  let rows: RecentScore[] | null;
  try {
    rows = await getRecentScores(8);
  } catch (e) {
    unstable_rethrow(e);
    rows = null;
  }

  return (
    <div className="activity-card">
      <div className="ac-head">
        <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
      </div>
      {rows === null ? (
        <DataError title="NO SE PUDO CARGAR" />
      ) : rows.length === 0 ? (
        <ScoreEmpty playHref="/juegos" />
      ) : (
        <div className="ticker">
          {rows.map((r, i) => (
            <div
              key={`${r.createdAt}-${i}`}
              className="tick-row"
              style={{ animationDelay: i * 60 + "ms" }}
            >
              <span className={"tk-p neon-" + r.color}>{r.player}</span>
              <span className="tk-mid">▸ {r.gameTitle}</span>
              <span className="tk-s">+{r.score.toLocaleString("es-ES")}</span>
              <span className="tk-t">{timeAgo(r.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function TopCard() {
  let rows: { player: string; score: number }[] | null;
  try {
    rows = await getTopLast24h(5);
  } catch (e) {
    unstable_rethrow(e);
    rows = null;
  }

  return (
    <div className="activity-card">
      <div className="ac-head">
        <div className="ac-title pixel neon-magenta">▸ TOP JUGADORES · HOY</div>
        <Link href="/salon-de-la-fama" className="lb-link">
          VER SALÓN →
        </Link>
      </div>
      {rows === null ? (
        <DataError title="NO SE PUDO CARGAR" />
      ) : rows.length === 0 ? (
        <ScoreEmpty playHref="/juegos" />
      ) : (
        <div className="top-list">
          {rows.map((r, i) => (
            <div
              key={`${r.player}-${i}`}
              className={
                "top-row" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
            >
              <span className="tp-rk">#{String(i + 1).padStart(2, "0")}</span>
              <span className="tp-bar">
                <span
                  className="tp-fill"
                  style={{ width: 100 - i * 16 + "%" }}
                ></span>
              </span>
              <span className="tp-p">{r.player}</span>
              <span className="tp-s">{r.score.toLocaleString("es-ES")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivitySection() {
  return (
    <Reveal className="home-section">
      <div className="section-head">
        <div className="kicker pixel neon-yellow">{"// 03"}</div>
        <h2 className="section-title">ACTIVIDAD EN VIVO</h2>
        <div className="section-rule"></div>
      </div>
      <div className="activity-grid">
        <Suspense fallback={<div className="activity-card" />}>
          <RecentCard />
        </Suspense>
        <Suspense fallback={<div className="activity-card" />}>
          <TopCard />
        </Suspense>
      </div>
    </Reveal>
  );
}
