import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Game } from '@/lib/games';
import { formatScore } from '@shared/utils/format';

/**
 * Tarjeta de un juego de la biblioteca: portada con etiqueta de categoría, descripción,
 * mejor puntuación y enlace «JUGAR». Toda la tarjeta navega a la ficha y se inclina con el
 * ratón (efecto solo visual: el teclado usa el enlace).
 * @example
 * ```html
 * <app-game-card [game]="game" />
 * ```
 */
@Component({
  selector: 'app-game-card',
  imports: [RouterLink],
  templateUrl: './game-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '(mousemove)': 'tilt($event)',
    '(mouseleave)': 'resetTilt()',
    '(click)': 'open()',
  },
})
export class GameCardComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);

  // ========== Inputs ==========
  readonly game = input.required<Game>();

  // ========== Computed ==========
  protected readonly hostClass = computed(() => `card accent-${this.game().color}`);
  protected readonly href = computed(() => `/juegos/${this.game().id}`);
  protected readonly best = computed(() => formatScore(this.game().best));

  // ========== Event handlers ==========
  protected tilt(event: MouseEvent): void {
    const el = this.el.nativeElement;
    const r = el.getBoundingClientRect();
    const px = (event.clientX - r.left) / r.width - 0.5;
    const py = (event.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  }

  protected resetTilt(): void {
    this.el.nativeElement.style.transform = '';
  }

  protected open(): void {
    void this.router.navigateByUrl(this.href());
  }
}
