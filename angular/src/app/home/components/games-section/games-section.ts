import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DataErrorComponent } from '@shared/components/data-error/data-error';
import { RevealDirective } from '@shared/directives/reveal/reveal';
import { GamesService } from '@shared/services/games.service';
import { MiniCardComponent } from '../mini-card/mini-card';

/** Juegos que muestra la home. */
const FEATURED_COUNT = 6;

/** Sección «Juegos disponibles ahora»: los 6 primeros del catálogo, leídos del BFF. */
@Component({
  selector: 'app-games-section',
  imports: [RouterLink, RevealDirective, DataErrorComponent, MiniCardComponent],
  templateUrl: './games-section.html',
  styleUrl: './games-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesSectionComponent {
  private readonly games = inject(GamesService);

  // ========== State ==========
  protected readonly catalog = rxResource({ stream: () => this.games.getGames() });

  // ========== Computed ==========
  protected readonly featured = computed(() =>
    (this.catalog.value() ?? []).slice(0, FEATURED_COUNT),
  );
}
