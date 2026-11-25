import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { getGameDefinition } from '@/lib/game-registry';
import { DataErrorComponent } from '../data-error/data-error';
import { GamesService } from '../games.service';
import { NotFoundComponent } from '../not-found/not-found';
import { GamePlayerComponent } from '@shared/components/game-player/game-player';

/**
 * Ruta `/juegos/:id/jugar`. Comprueba el registro de forma síncrona y carga el juego con
 * `rxResource` (sin resolver, para poder pintar «CARGANDO…»). Pinta el reproductor con el juego cargado.
 */
@Component({
  selector: 'app-play-page',
  imports: [DataErrorComponent, NotFoundComponent, GamePlayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './play-page.html',
  styleUrl: './play-page.css',
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
