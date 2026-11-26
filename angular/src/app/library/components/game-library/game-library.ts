import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CATEGORIES, CATEGORY_COLOR, type Category, type Game } from '@/lib/games';
import { GameCardComponent } from '../game-card/game-card';

type CategoryFilter = 'TODOS' | Category;

/**
 * Biblioteca: hero, buscador por nombre, chips de categoría y rejilla de tarjetas.
 * Los chips son `TODOS` más las categorías con al menos un juego, en el orden de `CATEGORIES`.
 * @example
 * ```html
 * <app-game-library [games]="games" />
 * ```
 */
@Component({
  selector: 'app-game-library',
  imports: [GameCardComponent],
  templateUrl: './game-library.html',
  styleUrl: './game-library.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fade-in' },
})
export class GameLibraryComponent {
  // ========== Inputs ==========
  readonly games = input.required<Game[]>();

  // ========== State ==========
  protected readonly query = signal('');
  protected readonly category = signal<CategoryFilter>('TODOS');

  // ========== Computed ==========
  protected readonly chips = computed(() => {
    const games = this.games();
    const filters: CategoryFilter[] = [
      'TODOS',
      ...CATEGORIES.filter((c) => games.some((g) => g.cat === c)),
    ];
    const active = this.category();
    return filters.map((label) => ({
      label,
      pressed: label === active,
      cls:
        'chip' +
        (label === 'TODOS' ? ' chip-all' : ` accent-${CATEGORY_COLOR[label]}`) +
        (label === active ? ' active' : ''),
    }));
  });

  protected readonly filtered = computed(() => {
    const cat = this.category();
    const q = this.query().toLowerCase();
    return this.games().filter(
      (g) => (cat === 'TODOS' || g.cat === cat) && g.title.toLowerCase().includes(q),
    );
  });

  // ========== Event handlers ==========
  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
