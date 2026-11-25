import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { getGameDefinition } from '@/lib/game-registry';
import { DataErrorComponent } from '@shared/components/data-error/data-error';
import { GamePlayerComponent } from '@shared/components/game-player/game-player';
import { NotFoundComponent } from '@shared/components/not-found/not-found';
import { GamesService } from '@shared/services/games.service';

/**
 * Ruta `/juegos/:id/jugar`. Comprueba el registro de forma síncrona y carga el juego con
 * `rxResource` (sin resolver, para poder pintar «CARGANDO…»). Pinta el reproductor con el
 * juego cargado.
 */
@Component({
  selector: 'app-play-page',
  imports: [DataErrorComponent, NotFoundComponent, GamePlayerComponent],
  templateUrl: './play-page.html',
  styleUrl: './play-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayPageComponent {
  // ========== Dependencies ==========
  private readonly games = inject(GamesService);

  // ========== Inputs ==========
  /** Segmento `:id` de la ruta (binding de parámetros). */
  readonly id = input.required<string>();

  // ========== Computed ==========
  protected readonly definition = computed(() => getGameDefinition(this.id()));

  // ========== State ==========
  protected readonly game = rxResource({
    params: () => (this.definition() ? this.id() : undefined),
    stream: ({ params }) => this.games.getGame(params),
  });
}
