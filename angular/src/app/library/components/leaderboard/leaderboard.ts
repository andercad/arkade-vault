import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ScoreRow } from '@/lib/scores';
import { formatScore } from '@shared/utils/format';
import { DataErrorComponent } from '@shared/components/data-error/data-error';
import { ScoreEmptyComponent } from '@shared/components/score-empty/score-empty';

/**
 * Ranking de un juego. `rows === null` → error de lectura; `rows` vacío → aún sin puntuaciones.
 * @example
 * ```html
 * <app-leaderboard [rows]="rows()" playHref="/juegos/snake/jugar" />
 * ```
 */
@Component({
  selector: 'app-leaderboard',
  imports: [DataErrorComponent, ScoreEmptyComponent],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'leaderboard' },
})
export class LeaderboardComponent {
  // ========== Inputs ==========
  readonly rows = input.required<ScoreRow[] | null>();
  /** Ruta del botón «JUGAR» del estado vacío. */
  readonly playHref = input<string>();

  // ========== Computed ==========
  protected readonly items = computed(() =>
    (this.rows() ?? []).map((r, i) => ({
      key: r.rank,
      cls: 'lb-row' + (i < 3 ? ` top${i + 1}` : ''),
      rank: String(r.rank).padStart(2, '0'),
      name: r.name,
      date: r.date,
      score: formatScore(r.score),
    })),
  );
}
