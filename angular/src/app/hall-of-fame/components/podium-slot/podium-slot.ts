import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ScoreRow } from '@/lib/scores';
import { formatScore } from '@shared/utils/format';

/**
 * Peana de una posición del podio. Sin fila muestra marcadores (`---`, `------`); el primer
 * puesto lleva la etiqueta «CAMPEÓN» y tipografía mayor.
 * @example
 * ```html
 * <app-podium-slot [row]="rows[0]" place="01" medal="gold" />
 * ```
 */
@Component({
  selector: 'app-podium-slot',
  templateUrl: './podium-slot.html',
  styleUrl: './podium-slot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
})
export class PodiumSlotComponent {
  // ========== Inputs ==========
  readonly row = input<ScoreRow>();
  readonly place = input.required<'01' | '02' | '03'>();
  readonly medal = input.required<'gold' | 'silver' | 'bronze'>();

  // ========== Computed ==========
  protected readonly hostClass = computed(() => `podium-slot ${this.medal()}`);
  protected readonly champion = computed(() => this.place() === '01');
  protected readonly score = computed(() => {
    const row = this.row();
    return row ? formatScore(row.score) : '------';
  });
}
