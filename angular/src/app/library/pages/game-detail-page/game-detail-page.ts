import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { formatPlays } from '@/lib/games';
import { DataErrorComponent } from '@shared/components/data-error/data-error';
import { LeaderboardComponent } from '@shared/components/leaderboard/leaderboard';
import { LoadingComponent } from '@shared/components/loading/loading';
import { NotFoundComponent } from '@shared/components/not-found/not-found';
import { GamesService } from '@shared/services/games.service';
import { formatScore } from '@shared/utils/format';

/** Filas del ranking que muestra la ficha. */
const TOP_LIMIT = 10;

/**
 * Ruta `/juegos/:id`: ficha del juego y su ranking. Id inexistente → «no encontrado» con
 * estado HTTP 404 real en SSR (`RESPONSE_INIT`). Un fallo del ranking no tumba la ficha: el
 * leaderboard pinta su propio error.
 */
@Component({
  selector: 'app-game-detail-page',
  imports: [
    RouterLink,
    DataErrorComponent,
    LeaderboardComponent,
    LoadingComponent,
    NotFoundComponent,
  ],
  templateUrl: './game-detail-page.html',
  styleUrl: './game-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GameDetailPageComponent {
  private readonly games = inject(GamesService);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  // ========== Inputs ==========
  /** Segmento `:id` de la ruta (binding de parámetros). */
  readonly id = input.required<string>();

  // ========== State ==========
  protected readonly game = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.games.getGame(params),
  });
  private readonly scores = rxResource({
    params: () => this.game.value()?.id,
    stream: ({ params }) => this.games.getTopScores(params, TOP_LIMIT),
  });

  // ========== Computed ==========
  /** `null` si falló la lectura del ranking; vacío mientras carga. */
  protected readonly rows = computed(() =>
    this.scores.error() ? null : (this.scores.value() ?? []),
  );
  protected readonly plays = computed(() => formatPlays(this.game.value()?.plays ?? 0));
  protected readonly best = computed(() => formatScore(this.game.value()?.best ?? 0));
  protected readonly playHref = computed(() => `/juegos/${this.id()}/jugar`);

  constructor() {
    // Id inexistente (la lectura terminó sin error y sin juego): 404 real en SSR.
    effect(() => {
      if (this.responseInit && this.game.status() === 'resolved' && this.game.value() === null) {
        this.responseInit.status = 404;
      }
    });
  }
}
