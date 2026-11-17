"use client";

import type { TouchControls, TouchDirection } from "@/lib/game-engine";
import { useEffect, useRef } from "react";

const DIRECTIONS: TouchDirection[] = ["up", "left", "right", "down"];

const DIRECTION_LABEL: Record<TouchDirection, string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};

// Punta del triángulo según la dirección (viewBox 0 0 24 24).
const ARROW_POINTS: Record<TouchDirection, string> = {
  up: "12,5 20,18 4,18",
  down: "12,19 20,6 4,6",
  left: "5,12 18,4 18,20",
  right: "19,12 6,4 6,20",
};

function emit(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: code === "Space" ? " " : code,
      bubbles: true,
    }),
  );
}

interface PadButtonProps {
  code: string | undefined;
  disabled: boolean;
  className: string;
  label: string;
  children: React.ReactNode;
}

// Un botón = una tecla virtual: keydown al pulsar, keyup al soltar o perder el dedo.
function PadButton({
  code,
  disabled,
  className,
  label,
  children,
}: PadButtonProps) {
  const down = useRef(false);

  const release = () => {
    if (!down.current || !code) return;
    down.current = false;
    emit("keyup", code);
  };

  // Mando inactivo (pausa / fin): suelta lo que estuviera pulsado.
  useEffect(() => {
    if (disabled) release();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // Nunca dejar una tecla pegada: al desmontar/ocultarse (cacheComponents),
  // al perder el foco de la ventana y al cambiar de pestaña o app.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") release();
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onHidden);
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      disabled={disabled}
      className={className}
      onPointerDown={(e) => {
        if (down.current || !code) return;
        // El táctil captura el puntero de forma implícita: soltarlo permite
        // que pointerleave se dispare al arrastrar el dedo fuera del botón.
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        down.current = true;
        emit("keydown", code);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()} // sin foco: Espacio/flechas siguen yendo al juego
    >
      {children}
    </button>
  );
}

export function TouchPad({
  controls,
  disabled = false,
}: {
  controls: TouchControls;
  disabled?: boolean;
}) {
  // actions[0] → A (magenta, extremo derecho); actions[1] → B (cian, a su izquierda).
  const actions = controls.actions
    .slice(0, 2)
    .map((action, i) => ({ action, letter: i === 0 ? "A" : "B" }))
    .reverse();

  return (
    <div className="gp" role="group" aria-label="Mando táctil">
      <div className="gp-body">
        <div className="gp-col gp-col-left">
          <div className="gp-dpad">
            {DIRECTIONS.map((dir) => {
              const code = controls.dpad[dir];
              return (
                <PadButton
                  key={dir}
                  code={code}
                  disabled={disabled || !code}
                  label={DIRECTION_LABEL[dir]}
                  className={`dp dp-${dir}`}
                >
                  <svg
                    className="dp-arrow"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <polygon points={ARROW_POINTS[dir]} fill="currentColor" />
                  </svg>
                </PadButton>
              );
            })}
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
        </div>
        {actions.length > 0 && (
          <div className="gp-col gp-col-right">
            <div className="gp-actions">
              {actions.map(({ action, letter }) => (
                <div key={action.code + action.label} className="ab-wrap">
                  <PadButton
                    code={action.code}
                    disabled={disabled}
                    label={action.label}
                    className={`ab ${letter === "A" ? "a" : "b"}`}
                  >
                    <span className="ab-ring" aria-hidden="true" />
                    <span className="ab-letter" aria-hidden="true">
                      {letter}
                    </span>
                  </PadButton>
                  <span className="ab-label" aria-hidden="true">
                    {action.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
