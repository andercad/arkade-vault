import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { GameEngine, GameSnapshot } from '@/lib/game-engine';
import type { GameDefinition } from '@/lib/game-registry';

/** Control que el padre usa para gobernar el motor (start/destroy los gestiona el componente). */
export type GameControl = Pick<GameEngine, 'pause' | 'resume' | 'restart' | 'end' | 'setOption'>;

/**
 * Canvas de un juego. Crea el motor solo en el navegador, lo recrea cuando cambia la
 * definición (el componente se reutiliza si solo cambia `:id`) y lo destruye al destruirse.
 * @example
 * ```html
 * <app-game-canvas [definition]="definition" (stateChange)="snap.set($event)" (gameOver)="over.set(true)" />
 * ```
 */
@Component({
  selector: 'app-game-canvas',
  templateUrl: './game-canvas.html',
  styleUrl: './game-canvas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCanvasComponent implements GameControl {
  // ========== Inputs ==========
  /** Definición del registro; al cambiar se recrea el motor. */
  readonly definition = input.required<GameDefinition>();

  // ========== Outputs ==========
  /** Snapshot del motor, solo cuando cambia algún campo. */
  readonly stateChange = output<GameSnapshot>();
  /** Fin de partida, una vez por partida, con la puntuación final. */
  readonly gameOver = output<number>();

  // ========== State ==========
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private engine: GameEngine | null = null;

  // ========== Computed ==========
  protected readonly aspectRatio = computed(
    () => `${this.definition().width} / ${this.definition().height}`,
  );

  // ========== Lifecycle ==========
  constructor() {
    // afterRenderEffect solo corre en el navegador: nunca se crea el motor en SSR.
    afterRenderEffect((onCleanup) => {
      const definition = this.definition();
      const engine = definition.create(this.canvas().nativeElement, {
        onState: (s) => this.stateChange.emit(s),
        onGameOver: (score) => this.gameOver.emit(score),
      });
      this.engine = engine;
      engine.start();
      onCleanup(() => {
        engine.destroy();
        this.engine = null;
      });
    });
  }

  // ========== Public methods ==========
  /**
   *
   */
  pause(): void {
    this.engine?.pause();
  }

  /**
   *
   */
  resume(): void {
    this.engine?.resume();
  }

  /**
   *
   */
  restart(): void {
    this.engine?.restart();
  }

  /**
   *
   */
  end(): void {
    this.engine?.end();
  }

  /**
   *
   */
  setOption(key: string, value: string): void {
    this.engine?.setOption?.(key, value);
  }
}
