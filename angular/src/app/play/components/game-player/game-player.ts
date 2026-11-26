import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { GameOption, GameSnapshot } from '@/lib/game-engine';
import { getGameDefinition } from '@/lib/game-registry';
import type { Game } from '@/lib/games';
import { GameCanvasComponent, type GameControl } from '../game-canvas/game-canvas';
import { TouchControlsComponent } from '../touch-controls/touch-controls';

const INITIAL_SNAPSHOT: GameSnapshot = { score: 0, status: 'playing', hud: [] };

/**
 * Reproductor de un juego: HUD del adaptador, opciones `live` en la barra y `restart` en el
 * overlay de pausa, pausa (botón; `P`/`Esc` los gestiona el motor), fin, menú de fin de
 * invitado y mando táctil. El jugador es siempre invitado (la sesión llega en la SPEC 26).
 * @example
 * ```html
 * <app-game-player [game]="game" />
 * ```
 */
@Component({
  selector: 'app-game-player',
  imports: [NgTemplateOutlet, RouterLink, GameCanvasComponent, TouchControlsComponent],
  templateUrl: './game-player.html',
  styleUrl: './game-player.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePlayerComponent {
  // ========== Inputs ==========
  /** Juego cargado; su id debe existir en `GAME_REGISTRY` (lo comprueba la página). */
  readonly game = input.required<Game>();

  // ========== State ==========
  private readonly canvas = viewChild.required<GameControl>('canvas');
  /**
   * Último snapshot del motor (solo cambia cuando lo emite). Estado limpio con cada juego nuevo,
   * porque el componente se reutiliza si solo cambia el id; al salir de la ruta Angular lo destruye.
   */
  protected readonly snap = linkedSignal<string, GameSnapshot>({
    source: () => this.game().id,
    computation: () => INITIAL_SNAPSHOT,
  });
  protected readonly over = linkedSignal<string, boolean>({
    source: () => this.game().id,
    computation: () => false,
  });
  /** Valores de las opciones (skin, nivel inicial…); vuelven a los de por defecto al cambiar de juego. */
  protected readonly optionValues = linkedSignal<Record<string, string>>(() =>
    Object.fromEntries(this.options().map((o) => [o.key, o.defaultValue])),
  );

  // ========== Computed ==========
  protected readonly definition = computed(() => getGameDefinition(this.game().id)!);
  protected readonly options = computed(() => this.definition().options ?? []);
  /** «live» se ven siempre en la barra; «restart» solo en el overlay de pausa. */
  protected readonly liveOptions = computed(() =>
    this.options().filter((o) => o.appliesOn === 'live'),
  );
  protected readonly restartOptions = computed(() =>
    this.options().filter((o) => o.appliesOn === 'restart'),
  );
  protected readonly paused = computed(() => this.snap().status === 'paused');
  protected readonly portrait = computed(() => this.definition().height > this.definition().width);
  protected readonly aspectRatio = computed(
    () => this.definition().width / this.definition().height,
  );

  // ========== Public methods ==========
  protected formatScore(n: number): string {
    return n.toLocaleString('es-ES');
  }

  protected togglePause(): void {
    if (this.paused()) this.canvas().resume();
    else this.canvas().pause();
  }

  /** El motor avisa del final vía `gameOver`. */
  protected finish(): void {
    this.canvas().end();
  }

  protected restart(): void {
    this.canvas().restart();
    this.over.set(false);
  }

  protected changeOption(opt: GameOption, event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.optionValues.update((prev) => ({ ...prev, [opt.key]: select.value }));
    this.canvas().setOption?.(opt.key, select.value);
    select.blur(); // flechas y Espacio no deben cambiar el selector
  }
}
