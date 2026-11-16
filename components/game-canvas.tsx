"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { GameCallbacks, GameEngine } from "@/lib/game-engine";
import type { GameDefinition } from "@/lib/game-registry";

// Control que el padre usa para gobernar el motor (start/destroy los gestiona el componente).
export type GameControl = Pick<
  GameEngine,
  "pause" | "resume" | "restart" | "end" | "setOption"
>;

interface Props extends GameCallbacks {
  definition: GameDefinition;
  ref?: Ref<GameControl>;
}

export function GameCanvas({ definition, ref, onState, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
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
      setOption: (key, value) => gameRef.current?.setOption?.(key, value),
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = definition.create(canvas, {
      onState: (s) => cbRef.current.onState(s),
      onGameOver: (score) => cbRef.current.onGameOver(score),
    });
    gameRef.current = game;
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [definition]);

  return (
    <canvas
      ref={canvasRef}
      width={definition.width}
      height={definition.height}
      className="game-canvas"
      style={{
        aspectRatio: `${definition.width} / ${definition.height}`,
        maxWidth: definition.width,
      }}
      aria-label={definition.aria}
    />
  );
}
