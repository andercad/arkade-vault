import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Efecto *reveal*: añade `.in` al elemento al entrar en pantalla (`IntersectionObserver`).
 * Sin observer o con `prefers-reduced-motion` lo añade de inmediato. Solo actúa en el navegador.
 * @example
 * ```html
 * <section appReveal class="home-section">…</section>
 * ```
 */
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal', '[class.in]': 'visible()' },
})
export class RevealDirective {
  // ========== Dependencies ==========
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // ========== State ==========
  protected readonly visible = signal(false);

  // ========== Lifecycle ==========
  constructor() {
    afterNextRender(() => this.observe());
  }

  // ========== Private methods ==========

  private observe(): void {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      this.visible.set(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.visible.set(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(this.el.nativeElement);
    this.destroyRef.onDestroy(() => io.disconnect());
  }
}
