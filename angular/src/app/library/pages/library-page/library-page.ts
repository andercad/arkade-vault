import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DataErrorComponent } from '@shared/components/data-error/data-error';
import { LoadingComponent } from '@shared/components/loading/loading';
import { GamesService } from '@shared/services/games.service';
import { GameLibraryComponent } from '../../components/game-library/game-library';

/** Ruta `/juegos`: carga el catálogo a través del BFF y pinta la biblioteca. */
@Component({
  selector: 'app-library-page',
  imports: [DataErrorComponent, LoadingComponent, GameLibraryComponent],
  templateUrl: './library-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LibraryPageComponent {
  private readonly games = inject(GamesService);

  // ========== State ==========
  protected readonly catalog = rxResource({ stream: () => this.games.getGames() });
}
