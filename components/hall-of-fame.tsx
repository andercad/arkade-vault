"use client";

import { useState } from "react";
import Link from "next/link";
import { DataError } from "@/components/data-error";
import { ScoreEmpty } from "@/components/score-empty";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";
import { useAuth } from "@/lib/auth";

const fmt = (n: number) => n.toLocaleString("es-ES");

function Slot({
  row,
  place,
  cls,
}: {
  row: ScoreRow | undefined;
  place: "01" | "02" | "03";
  cls: "gold" | "silver" | "bronze";
}) {
  const champion = place === "01";
  return (
    <div className={"podium-slot " + cls}>
      {champion && (
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--gold)",
            letterSpacing: "0.18em",
          }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {place}
      </div>
      <div className="name">{row ? row.name : "---"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {row ? fmt(row.score) : "------"}
      </div>
      <div className="date">{row ? row.date : ""}</div>
    </div>
  );
}

export function HallOfFame({
  games,
  scores,
}: {
  games: Game[];
  // null = error al leer el ranking de ese juego
  scores: Record<string, ScoreRow[] | null>;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState(games[0].id);
  const game = games.find((g) => g.id === tab) ?? games[0];
  const rows = scores[game.id] ?? null;

  // Marca del usuario con sesión, solo si su nombre aparece en el top real.
  const myName = user?.name.toUpperCase().slice(0, 10);
  const mine = rows && myName ? rows.find((r) => r.name === myName) : undefined;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows && rows.length > 0 && (
        <div className="podium">
          <Slot row={rows[1]} place="02" cls="silver" />
          <Slot row={rows[0]} place="01" cls="gold" />
          <Slot row={rows[2]} place="03" cls="bronze" />
        </div>
      )}

      <div className="hall-table">
        {rows === null ? (
          <DataError
            title="NO SE PUDO CARGAR EL RANKING"
            hint="Recarga la página en unos segundos."
          />
        ) : rows.length === 0 ? (
          <ScoreEmpty playHref={`/juegos/${game.id}/jugar`} />
        ) : (
          <>
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {mine && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(mine.rank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {mine.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {fmt(mine.score)}
                  </div>
                  <div className="dt">{mine.date}</div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
