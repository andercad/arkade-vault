"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import { H, W } from "@/lib/asteroids/constants";
import type { AsteroidsCallbacks, AsteroidsGame } from "@/lib/asteroids/types";

// Control que el padre usa para gobernar el motor (start/destroy los gestiona el componente).
export type AsteroidsControl = Pick<
  AsteroidsGame,
  "pause" | "resume" | "restart" | "end"
>;

interface Props extends AsteroidsCallbacks {
  ref?: Ref<AsteroidsControl>;
}

export function AsteroidsCanvas({ ref, onState, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  // Últimos callbacks, para no recrear el motor cuando cambian.
  const cbRef = useRef({ onState, onGameOver });

  useEffect(() => {
    cbRef.current = { onState, onGameOver };
  }, [onState, onGameOver]);

  useImperativeHandle(
    ref,
    () => ({
      pause: () => gameRef.current?.pause(),
      resume: () => gameRef.current?.resume(),
      restart: () => gameRef.current?.restart(),
      end: () => gameRef.current?.end(),
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createAsteroidsGame(canvas, {
      onState: (s) => cbRef.current.onState(s),
      onGameOver: (score) => cbRef.current.onGameOver(score),
    });
    gameRef.current = game;
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="asteroids-canvas"
      aria-label="Asteroids"
    />
  );
}
