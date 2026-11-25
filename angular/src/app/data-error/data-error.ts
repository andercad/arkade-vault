import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Estado de error genérico: nunca muestra el detalle de la causa. */
@Component({
  selector: 'app-data-error',
  host: { role: 'alert', '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="de-title">{{ title() }}</p>
    <p class="de-hint">{{ hint() }}</p>
  `,
})
export class DataErrorComponent {
  readonly title = input('NO SE PUDO CARGAR');
  readonly hint = input('Recarga la página en unos segundos.');
  readonly gridSpan = input(false);

  protected readonly hostClass = computed(
    () => 'data-error' + (this.gridSpan() ? ' span-all' : ''),
  );
}
