import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { EMAIL_ERROR, isValidEmail } from '@/lib/auth-validation';

/**
 * Recuperar contraseña (solo UI hasta la SPEC 26): valida el correo y, si es válido, avisa
 * «Disponible próximamente» sin hacer ninguna petición.
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
  // ========== Outputs ==========
  /** El usuario pide volver a «Iniciar sesión». */
  readonly back = output<void>();

  // ========== State ==========
  protected readonly email = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly soon = signal(false);

  // ========== Event handlers ==========
  protected onEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!isValidEmail(this.email().trim())) {
      this.soon.set(false);
      this.error.set(EMAIL_ERROR);
      return;
    }
    this.error.set(null);
    this.soon.set(true);
  }
}
