import { DataError } from "@/components/data-error";
import { ScoreEmpty } from "@/components/score-empty";
import type { ScoreRow } from "@/lib/scores";

// rows === null → error de lectura; rows vacío → aún sin puntuaciones.
export function Leaderboard({
  rows,
  playHref,
}: {
  rows: ScoreRow[] | null;
  playHref?: string;
}) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows === null ? (
        <DataError
          title="NO SE PUDO CARGAR EL RANKING"
          hint="Recarga la página en unos segundos."
        />
      ) : rows.length === 0 ? (
        <ScoreEmpty playHref={playHref} />
      ) : (
        rows.map((r, i) => (
          <div
            key={r.rank}
            className={
              "lb-row" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
