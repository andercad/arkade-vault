import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Marcador vacío: filas fantasma en el mismo grid que las filas reales.
 * @example
 * ```html
 * <app-score-empty playHref="/juegos/snake/jugar" />
 * ```
 */
@Component({
  selector: 'app-score-empty',
  imports: [RouterLink],
  templateUrl: './score-empty.html',
  styleUrl: './score-empty.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'score-empty' },
})
export class ScoreEmptyComponent {
  // ========== Inputs ==========
  /** Si se indica, muestra el botón «JUGAR» hacia esa ruta. */
  readonly playHref = input<string>();

  // ========== Constants ==========
  protected readonly ghosts = [1, 2, 3];
}
