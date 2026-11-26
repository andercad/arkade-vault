import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProfileService } from '@shared/services/profile.service';
import { apiErrorMessage } from '@shared/utils/api-error';

type Field = 'current' | 'password' | 'repeat';

/**
 * Sección desplegable «Cambiar contraseña» de `/perfil` (solo para cuentas con identidad email;
 * lo decide la página). Pide la actual, la nueva y su repetición; el servidor valida y verifica
 * la actual. Al terminar se cierra con el aviso «Contraseña actualizada.».
 * @example
 * ```html
 * <app-password-section />
 * ```
 */
@Component({
  selector: 'app-password-section',
  templateUrl: './password-section.html',
  styleUrl: './password-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordSectionComponent {
  private readonly profile = inject(ProfileService);

  // ========== State ==========
  protected readonly open = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly pending = signal(false);
  private readonly values: Record<Field, string> = { current: '', password: '', repeat: '' };

  // ========== Event handlers ==========
  protected show(): void {
    this.done.set(false);
    this.open.set(true);
  }

  protected cancel(): void {
    this.open.set(false);
    this.error.set(null);
    this.reset();
  }

  protected onInput(field: Field, event: Event): void {
    this.values[field] = (event.target as HTMLInputElement).value;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) return;
    this.error.set(null);
    this.done.set(false);
    this.pending.set(true);
    try {
      await firstValueFrom(this.profile.changePassword({ ...this.values }));
      this.reset();
      this.open.set(false);
      this.done.set(true);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.pending.set(false);
    }
  }

  private reset(): void {
    this.values.current = this.values.password = this.values.repeat = '';
  }
}
