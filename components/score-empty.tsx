import Link from "next/link";

// Marcador vacío: filas fantasma en el mismo grid que las filas reales.
export function ScoreEmpty({ playHref }: { playHref?: string }) {
  return (
    <div className="score-empty">
      <p className="se-title">AÚN SIN PUNTUACIONES</p>
      <p className="se-hint">
        Juega una partida y deja tu nombre en el primer puesto.
      </p>
      {[1, 2, 3].map((n) => (
        <div key={n} className="ghost-row" aria-hidden="true">
          <span>#{String(n).padStart(2, "0")}</span>
          <span className="nm">---</span>
          <span className="sc">------</span>
        </div>
      ))}
      {playHref && (
        <Link href={playHref} className="btn se-cta">
          ▶ JUGAR
        </Link>
      )}
    </div>
  );
}
