import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DataErrorComponent } from '@shared/components/data-error/data-error';
import { ScoreEmptyComponent } from '@shared/components/score-empty/score-empty';
import { RevealDirective } from '@shared/directives/reveal/reveal';
import { ScoresService } from '@shared/services/scores.service';
import { formatScore } from '@shared/utils/format';

/** Escalón de la barra de «top de hoy»: 100 % la primera fila, 16 puntos menos por fila. */
const BAR_STEP = 16;
/** Retardo de entrada entre filas del *ticker*, en ms. */
const TICK_STEP_MS = 60;

/**
 * Sección «Actividad en vivo»: últimas puntuaciones y top de las últimas 24 h. Cada tarjeta
 * carga su dato por separado, de modo que un fallo en una no afecta a la otra.
 */
@Component({
  selector: 'app-activity-section',
  imports: [RouterLink, RevealDirective, DataErrorComponent, ScoreEmptyComponent],
  templateUrl: './activity-section.html',
  styleUrl: './activity-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitySectionComponent {
  private readonly scores = inject(ScoresService);

  // ========== State ==========
  protected readonly recent = rxResource({ stream: () => this.scores.getRecent() });
  protected readonly topToday = rxResource({ stream: () => this.scores.getTopToday() });

  // ========== Computed ==========
  protected readonly recentRows = computed(() =>
    (this.recent.value() ?? []).map((r, i) => ({
      key: `${i}-${r.player}-${r.ago}`,
      player: r.player,
      midClass: `tk-mid neon-${r.color}`,
      gameTitle: r.gameTitle,
      score: formatScore(r.score),
      ago: r.ago,
      delay: i * TICK_STEP_MS,
    })),
  );

  protected readonly topRows = computed(() =>
    (this.topToday.value() ?? []).map((r, i) => ({
      key: `${i}-${r.player}`,
      cls: 'top-row' + (i < 3 ? ` top${i + 1}` : ''),
      rank: String(i + 1).padStart(2, '0'),
      width: 100 - i * BAR_STEP,
      player: r.player,
      score: formatScore(r.score),
    })),
  );
}
