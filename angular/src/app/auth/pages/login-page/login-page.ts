import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AuthFormComponent } from '../../components/auth-form/auth-form';

const OAUTH_ERROR =
  'No se pudo completar el acceso. Inténtalo de nuevo o entra con tu usuario y contraseña.';
const CONFIRMED_NOTICE = 'Email confirmado. Ya puedes iniciar sesión con tu cuenta.';

/**
 * Ruta `/login` (renderizada en cliente, solo UI hasta la SPEC 26). `?error=oauth` y
 * `?confirmed=1` muestran sus avisos, como en Next.
 */
@Component({
  selector: 'app-login-page',
  imports: [AuthFormComponent],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPageComponent {
  // ========== Inputs ==========
  /** Query param `?error=` (binding de la ruta). */
  readonly error = input<string>();
  /** Query param `?confirmed=` (binding de la ruta). */
  readonly confirmed = input<string>();

  // ========== Computed ==========
  protected readonly initialError = computed(() => (this.error() === 'oauth' ? OAUTH_ERROR : null));
  protected readonly initialNotice = computed(() =>
    this.confirmed() === '1' ? CONFIRMED_NOTICE : null,
  );
}
