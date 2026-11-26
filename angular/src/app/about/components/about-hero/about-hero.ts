import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { AccentColor } from '@/lib/games';
import { RevealDirective } from '@shared/directives/reveal/reveal';
import { HighlightIconComponent, type HighlightIconKind } from '../highlight-icon/highlight-icon';

interface Highlight {
  icon: HighlightIconKind;
  text: string;
  color: AccentColor;
}

/** Hero de «Acerca de»: misión, tres puntos destacados y separador decorativo. */
@Component({
  selector: 'app-about-hero',
  imports: [RevealDirective, HighlightIconComponent],
  templateUrl: './about-hero.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutHeroComponent {
  // ========== Constants ==========
  protected readonly highlights: readonly Highlight[] = [
    { icon: 'HEART', text: 'HECHO CON ❤️ PARA JUGADORES', color: 'magenta' },
    { icon: 'BROWSER', text: 'JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR', color: 'cyan' },
    { icon: 'PLANT', text: 'PROYECTO EN CONSTANTE CRECIMIENTO', color: 'green' },
  ];
  /** Cuadros del separador pixel (solo decorativo). */
  protected readonly pixels = Array.from({ length: 24 }, (_, i) => i);
}
