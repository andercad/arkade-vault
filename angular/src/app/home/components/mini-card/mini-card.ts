import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Game } from '@/lib/games';

/**
 * Mini tarjeta de un juego para la home: portada, título y categoría; enlaza a la ficha.
 * @example
 * ```html
 * <app-mini-card [game]="game" />
 * ```
 */
@Component({
  selector: 'app-mini-card',
  imports: [RouterLink],
  templateUrl: './mini-card.html',
  styleUrl: './mini-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mini-card' },
})
export class MiniCardComponent {
  // ========== Inputs ==========
  readonly game = input.required<Game>();

  // ========== Computed ==========
  protected readonly href = computed(() => `/juegos/${this.game().id}`);
}
