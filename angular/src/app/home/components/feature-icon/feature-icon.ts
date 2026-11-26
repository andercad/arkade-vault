import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { FeatureIconKind } from '@/lib/home';

/**
 * Icono pixel de una característica (decorativo, `aria-hidden`).
 * @example
 * ```html
 * <app-feature-icon kind="TROPHY" />
 * ```
 */
@Component({
  selector: 'app-feature-icon',
  templateUrl: './feature-icon.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureIconComponent {
  // ========== Inputs ==========
  readonly kind = input.required<FeatureIconKind>();
}
