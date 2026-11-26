import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Estado de error genérico: nunca muestra el detalle de la causa.
 * @example
 * ```html
 * <app-data-error title="NO SE PUDO CARGAR" hint="Recarga la página en unos segundos." />
 * ```
 */
@Component({
  selector: 'app-data-error',
  templateUrl: './data-error.html',
  styleUrl: './data-error.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert', '[class]': 'hostClass()' },
})
export class DataErrorComponent {
  // ========== Inputs ==========
  readonly title = input('NO SE PUDO CARGAR');
  readonly hint = input('Recarga la página en unos segundos.');
  /** Ocupa todas las columnas de una rejilla (`span-all`). */
  readonly gridSpan = input(false);

  // ========== Computed ==========
  protected readonly hostClass = computed(
    () => 'data-error' + (this.gridSpan() ? ' span-all' : ''),
  );
}
