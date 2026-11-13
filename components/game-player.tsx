"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import { saveScore } from "@/lib/scores";
import { useAuth } from "@/lib/auth";
import type { AsteroidsSnapshot } from "@/lib/asteroids/types";
import {
  AsteroidsCanvas,
  type AsteroidsControl,
} from "@/components/asteroids-canvas";

const LIVES = 3;
const POINTS_PER_LEVEL = 2500;

const INITIAL_SNAPSHOT: AsteroidsSnapshot = {
  score: 0,
  lives: LIVES,
  level: 1,
  tripleSeconds: 0,
  status: "playing",
};

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  // Asteroids usa el motor real; el resto de juegos sigue con la simulación.
  const real = game.id === "asteroids";
  const control = useRef<AsteroidsControl>(null);

  const [simScore, setSimScore] = useState(0);
  const [simPaused, setSimPaused] = useState(false);
  const [snap, setSnap] = useState<AsteroidsSnapshot>(INITIAL_SNAPSHOT);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  // Override manual del nombre; si es null se usa el de la sesión o "INVITADO".
  const [typedName, setTypedName] = useState<string | null>(null);

  const name = typedName ?? user?.name ?? "INVITADO";
  const score = real ? snap.score : simScore;
  const paused = real ? snap.status === "paused" : simPaused;
  const lives = real ? snap.lives : LIVES;
  const level = real ? snap.level : 1 + Math.floor(simScore / POINTS_PER_LEVEL);
  const fmt = (n: number) => n.toLocaleString("es-ES");

  useEffect(() => {
    if (real || over || simPaused) return;
    const t = setInterval(
      () => setSimScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [real, over, simPaused]);

  const togglePause = () => {
    if (!real) {
      setSimPaused((p) => !p);
      return;
    }
    if (snap.status === "paused") control.current?.resume();
    else control.current?.pause();
  };

  const finish = () => {
    if (real)
      control.current?.end(); // el motor avisa vía onGameOver
    else setOver(true);
  };

  const restart = () => {
    if (real) {
      control.current?.restart();
    } else {
      setSimScore(0);
      setSimPaused(false);
    }
    setOver(false);
    setSaved(false);
  };

  const save = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{fmt(score)}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim()}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish}>
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      {real && <div className="keyboard-notice">REQUIERE TECLADO</div>}

      <div className="crt">
        <div className="crt-screen">
          {real ? (
            <AsteroidsCanvas
              ref={control}
              onState={setSnap}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  {real
                    ? "PULSA REANUDAR, P O ESC PARA CONTINUAR"
                    : "PULSA REANUDAR PARA CONTINUAR"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{fmt(score)}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setTypedName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={save}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
