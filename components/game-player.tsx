"use client";

import { GameCanvas, type GameControl } from "@/components/game-canvas";
import { TouchPad } from "@/components/touch-controls";
import { useAuth } from "@/lib/auth";
import type { GameOption, GameSnapshot } from "@/lib/game-engine";
import { getGameDefinition } from "@/lib/game-registry";
import type { Game } from "@/lib/games";
import { submitScore } from "@/lib/scores";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Último nombre guardado por el jugador (invitado), para pre-rellenar el modal.
const NAME_KEY = "av_player_name";
const nameListeners = new Set<() => void>();

function subscribeName(cb: () => void) {
  nameListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    nameListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readStoredName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

function writeStoredName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    return;
  }
  nameListeners.forEach((cb) => cb());
}

const INITIAL_SNAPSHOT: GameSnapshot = {
  score: 0,
  status: "playing",
  hud: [],
};

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  const control = useRef<GameControl>(null);
  // La página ya devuelve 404 si el id no está en el registro.
  const definition = getGameDefinition(game.id)!;

  const [snap, setSnap] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Override manual del nombre; si es null se usa el de la sesión o "INVITADO".
  const [typedName, setTypedName] = useState<string | null>(null);

  // Valores de las opciones del juego (skin, nivel inicial…), declaradas en el registro.
  const [optionValues, setOptionValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (definition.options ?? []).map((o) => [o.key, o.defaultValue]),
    ),
  );

  // Con cacheComponents, Next oculta la página (Activity) en vez de desmontarla
  // y conserva el estado de React. El cleanup se ejecuta al ocultarse: así, al
  // volver a entrar, el modal de fin está cerrado y la partida empieza limpia.
  useEffect(() => {
    return () => {
      setSnap(INITIAL_SNAPSHOT);
      setOver(false);
      setSaved(false);
      setSaving(false);
      setSaveError(false);
      setTypedName(null);
    };
  }, []);

  const storedName = useSyncExternalStore(
    subscribeName,
    readStoredName,
    () => null,
  );
  const name = typedName ?? user?.name ?? storedName ?? "INVITADO";
  const { score } = snap;
  // "live" se ven siempre en la barra; "restart" solo en el overlay de pausa.
  const liveOptions = (definition.options ?? []).filter(
    (o) => o.appliesOn === "live",
  );
  const restartOptions = (definition.options ?? []).filter(
    (o) => o.appliesOn === "restart",
  );
  const paused = snap.status === "paused";
  const fmt = (n: number) => n.toLocaleString("es-ES");

  const togglePause = () => {
    if (snap.status === "paused") control.current?.resume();
    else control.current?.pause();
  };

  const finish = () => {
    control.current?.end(); // el motor avisa vía onGameOver
  };

  const restart = () => {
    control.current?.restart();
    setOver(false);
    setSaved(false);
    setSaveError(false);
  };

  const changeOption = (key: string, value: string) => {
    setOptionValues((prev) => ({ ...prev, [key]: value }));
    control.current?.setOption?.(key, value);
  };

  const renderOption = (opt: GameOption) => (
    <label key={opt.key} className="player-option">
      <span className="l">{opt.label}</span>
      <select
        value={optionValues[opt.key]}
        onChange={(e) => {
          changeOption(opt.key, e.target.value);
          e.target.blur(); // flechas y Espacio no deben cambiar el selector
        }}
      >
        {opt.choices.map((ch) => (
          <option key={ch.value} value={ch.value}>
            {ch.label}
          </option>
        ))}
      </select>
    </label>
  );

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    // Nombre vacío → "INVITADO" (el CHECK de BD exige 1 a 10 caracteres).
    const finalName = name.trim().toUpperCase().slice(0, 10) || "INVITADO";
    // La BD admite 0 a 1.000.000 (CHECK).
    const ok = await submitScore({
      gameId: game.id,
      name: finalName,
      score: Math.min(score, 1_000_000),
    });
    setSaving(false);
    if (ok) {
      // Solo invitados: el nombre de un usuario con sesión es su username.
      if (!user) writeStoredName(finalName);
      setSaved(true);
    } else setSaveError(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="hud-stats">
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
          {snap.hud.map((item) => (
            <div key={item.key} className={`hud-stat ${item.key}`}>
              <div className="l">{item.label}</div>
              <div className="v">{item.value}</div>
            </div>
          ))}
        </div>
        {liveOptions.map(renderOption)}
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

      <div
        className={
          definition.height > definition.width ? "crt crt-portrait" : "crt"
        }
        style={
          {
            "--ar": definition.width / definition.height,
          } as React.CSSProperties
        }
      >
        <div className="crt-screen">
          <GameCanvas
            definition={definition}
            ref={control}
            onState={setSnap}
            onGameOver={() => setOver(true)}
          />
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
                  PULSA REANUDAR, P O ESC PARA CONTINUAR
                </div>
                {restartOptions.length > 0 && (
                  <div className="pause-options">
                    {restartOptions.map(renderOption)}
                    <button className="btn" onClick={restart}>
                      REINICIAR
                    </button>
                  </div>
                )}
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

      {definition.touchControls && (
        <TouchPad
          controls={definition.touchControls}
          disabled={paused || over}
        />
      )}

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
                <button className="btn yellow" onClick={save} disabled={saving}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && !saved && (
              <div
                role="alert"
                className="pixel"
                style={{ fontSize: 10, color: "var(--magenta)", marginTop: 12 }}
              >
                NO SE PUDO GUARDAR · REINTENTA
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link
                href={`/salon-de-la-fama?juego=${game.id}`}
                className="btn yellow"
              >
                VER SALÓN DE LA FAMA
              </Link>
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
