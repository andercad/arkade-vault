import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';
import { NavigationService } from '@shared/services/navigation.service';
import { apiErrorMessage } from '@shared/utils/api-error';
import { firstValueFrom } from 'rxjs';
import { validatePassword } from '@/lib/auth-validation';

type Field = 'pass' | 'repeat';

/**
 * Formulario de nueva contraseña de `/auth/reset-password`. Sin `code` muestra el error del
 * enlace con un acceso a `/login`; con `code` valida la contraseña y la envía junto con el
 * código a `AuthService.recover` (el código se canjea al enviar, no al cargar). Tras el éxito la
 * sesión ya está abierta: navegación completa a `/` para releerla, como en Next.
 * @example
 * ```html
 * <app-reset-password-form [code]="code()" />
 * ```
 */
@Component({
  selector: 'app-reset-password-form',
  imports: [RouterLink],
  templateUrl: './reset-password-form.html',
  styleUrl: './reset-password-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordFormComponent {
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);

  // ========== Inputs ==========
  /** Código del enlace de recuperación (`?code`); `null` o vacío = enlace inválido. */
  readonly code = input<string | null | undefined>(null);

  // ========== State ==========
  protected readonly pass = signal('');
  protected readonly repeat = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly invalid = signal<readonly Field[]>([]);
  protected readonly pending = signal(false);

  // ========== Event handlers ==========
  protected update(field: Field, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    (field === 'pass' ? this.pass : this.repeat).set(value);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const code = this.code();
    if (this.pending() || !code) return;
    const pass = this.pass();

    const weak = validatePassword(pass);
    const mismatch = !weak && pass !== this.repeat() ? 'Las contraseñas no coinciden.' : null;
    this.error.set(weak ?? mismatch);
    this.invalid.set(weak ? ['pass'] : mismatch ? ['repeat'] : []);
    if (weak || mismatch) return;

    this.pending.set(true);
    try {
      await firstValueFrom(this.auth.recover(code, pass));
      this.navigation.assign('/');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      this.pending.set(false);
    }
  }

  protected isInvalid(field: Field): boolean {
    return this.invalid().includes(field);
  }
}
