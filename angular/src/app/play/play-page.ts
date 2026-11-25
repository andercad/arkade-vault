import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { getGameDefinition } from '@/lib/game-registry';
import { DataErrorComponent } from '../data-error/data-error';
import { GamesService } from '../games.service';
import { NotFoundComponent } from '../not-found/not-found';

/**
 * Ruta `/juegos/:id/jugar`. Comprueba el registro de forma síncrona y carga el juego con
 * `rxResource` (sin resolver, para poder pintar «CARGANDO…»). El reproductor llega en el paso 5.
 */
@Component({
  selector: 'app-play-page',
  imports: [DataErrorComponent, NotFoundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!definition()) {
      <app-not-found />
    } @else if (game.isLoading()) {
      <div class="pixel play-loading">CARGANDO…</div>
    } @else if (game.error()) {
      <app-data-error />
    } @else if (game.value(); as g) {
      <h1 class="pixel play-title">{{ g.title }}</h1>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .play-loading {
      text-align: center;
      padding: 80px;
      color: var(--ink-faint);
    }
    .play-title {
      text-align: center;
      padding: 80px;
    }
  `,
})
export class PlayPageComponent {
  /** Segmento `:id` de la ruta (binding de parámetros). */
  readonly id = input.required<string>();

  private readonly games = inject(GamesService);
  protected readonly definition = computed(() => getGameDefinition(this.id()));

  protected readonly game = rxResource({
    params: () => (this.definition() ? this.id() : undefined),
    stream: ({ params }) => this.games.getGame(params),
  });
}
