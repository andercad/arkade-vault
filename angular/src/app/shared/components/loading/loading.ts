import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Aviso «CARGANDO…» mientras llegan los datos de una página.
 * @example
 * ```html
 * <app-loading />
 * ```
 */
@Component({
  selector: 'app-loading',
  templateUrl: './loading.html',
  styleUrl: './loading.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pixel', role: 'status' },
})
export class LoadingComponent {}
