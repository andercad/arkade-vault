import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TouchControls, TouchDirection } from '@/lib/game-engine';
import { PadButtonComponent } from './touch-pad-button';

const DIRECTIONS: TouchDirection[] = ['up', 'left', 'right', 'down'];

const DIRECTION_LABEL: Record<TouchDirection, string> = {
  up: 'Arriba',
  down: 'Abajo',
  left: 'Izquierda',
  right: 'Derecha',
};

/** Punta del triángulo según la dirección (viewBox 0 0 24 24). */
const ARROW_POINTS: Record<TouchDirection, string> = {
  up: '12,5 20,18 4,18',
  down: '12,19 20,6 4,6',
  left: '5,12 18,4 18,20',
  right: '19,12 6,4 6,20',
};

/**
 * Mando táctil Gamepad MK-II. Solo se ve con `pointer: coarse` (CSS de `.gp`) y emite
 * `KeyboardEvent` sintéticos en `window`. Se desactiva con `disabled` (pausa / fin).
 * @example
 * ```html
 * <app-touch-controls [controls]="definition.touchControls" [disabled]="paused() || over()" />
 * ```
 */
@Component({
  selector: 'app-touch-controls',
  imports: [PadButtonComponent],
  templateUrl: './touch-controls.html',
  styleUrl: './touch-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TouchControlsComponent {
  // ========== Inputs ==========
  /** Teclas del d-pad y de las acciones, desde el registro. */
  readonly controls = input.required<TouchControls>();
  /** Mando inactivo (pausa / fin de partida). */
  readonly disabled = input(false);

  // ========== State ==========
  protected readonly directions = DIRECTIONS;
  protected readonly directionLabel = DIRECTION_LABEL;
  protected readonly arrowPoints = ARROW_POINTS;

  // ========== Computed ==========
  /** actions[0] → A (magenta, extremo derecho); actions[1] → B (cian, a su izquierda). */
  protected readonly actions = computed(() =>
    this.controls()
      .actions.slice(0, 2)
      .map((action, i) => ({ action, letter: i === 0 ? 'A' : 'B' }))
      .reverse(),
  );
}
