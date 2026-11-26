import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Icono de un punto destacado de «Acerca de». */
export type HighlightIconKind = 'HEART' | 'BROWSER' | 'PLANT';

/**
 * Icono pixel decorativo (`aria-hidden`) de un punto destacado.
 * @example
 * ```html
 * <app-highlight-icon kind="HEART" />
 * ```
 */
@Component({
  selector: 'app-highlight-icon',
  templateUrl: './highlight-icon.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HighlightIconComponent {
  // ========== Inputs ==========
  readonly kind = input.required<HighlightIconKind>();
}
