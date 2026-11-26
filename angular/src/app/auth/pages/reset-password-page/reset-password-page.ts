import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ResetPasswordFormComponent } from '../../components/reset-password-form/reset-password-form';

/**
 * Ruta `/auth/reset-password` (renderizada en cliente). Lee `?code` del enlace de recuperación
 * y se lo pasa al formulario; no consume el código al cargar.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ResetPasswordFormComponent],
  templateUrl: './reset-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResetPasswordPageComponent {
  // ========== Inputs ==========
  /** Query param `?code=` (binding de la ruta). */
  readonly code = input<string>();
}
