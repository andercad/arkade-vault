import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Página provisional de la SPEC 25: ocupa la ruta hasta que su pantalla real exista
 * (pasos 3-6). Se elimina al terminar el paso 6. El nombre llega por `data` de la ruta.
 */
@Component({
  selector: 'app-provisional-page',
  templateUrl: './provisional-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProvisionalPageComponent {
  /** Nombre de la pantalla pendiente (`data.name` de la ruta). */
  readonly name = input('');
}
