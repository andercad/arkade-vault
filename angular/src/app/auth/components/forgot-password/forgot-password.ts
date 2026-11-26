import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AuthService } from '@shared/services/auth.service';
import { apiErrorMessage } from '@shared/utils/api-error';
import { firstValueFrom } from 'rxjs';
import { EMAIL_ERROR, isValidEmail } from '@/lib/auth-validation';

/**
 * Recuperar contraseña: valida el correo y pide el enlace a `AuthService`. La respuesta es la
 * misma exista o no la cuenta («REVISA TU CORREO»), para no enumerar correos.
 * @example
 * ```html
 * <app-forgot-password (back)="forgot.set(false)" />
 * ```
 */
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  // ========== Outputs ==========
  /** El usuario pide volver a «Iniciar sesión». */
  readonly back = output<void>();

  // ========== State ==========
  protected readonly email = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly pending = signal(false);
  /** Correo al que se pidió el enlace; muestra «Revisa tu correo». */
  protected readonly sentTo = signal<string | null>(null);

  // ========== Event handlers ==========
  protected onEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) return;
    const value = this.email().trim();
    if (!isValidEmail(value)) {
      this.error.set(EMAIL_ERROR);
      return;
    }
    this.error.set(null);
    this.pending.set(true);
    try {
      await firstValueFrom(this.auth.forgotPassword(value));
      this.sentTo.set(value);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.pending.set(false);
    }
  }
}
