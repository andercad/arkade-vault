import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { USERNAME_ERROR, USERNAME_RE } from '@/lib/auth-validation';
import type { SessionUser } from '@shared/models/session';
import { ProfileService } from '@shared/services/profile.service';
import { apiErrorMessage } from '@shared/utils/api-error';

/**
 * Formulario de cambio de usuario de `/perfil`. Valida (`A-Z0-9_`, 3-10) y envía a
 * `ProfileService`; el servidor lo guarda en mayúsculas y la sesión se refresca sola. Avisa a
 * la página de si hay cambios sin guardar con `dirty` (para rotular «Salir sin guardar»).
 * @example
 * ```html
 * <app-profile-form [user]="user" [(dirty)]="dirty" />
 * ```
 */
@Component({
  selector: 'app-profile-form',
  templateUrl: './profile-form.html',
  styleUrl: './profile-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent {
  private readonly profile = inject(ProfileService);

  // ========== Inputs / Outputs ==========
  readonly user = input.required<SessionUser>();
  /** Hay cambios sin guardar en el campo de usuario. */
  readonly dirty = model(false);

  // ========== State ==========
  /** Texto del campo; vuelve al usuario actual cuando este cambia. */
  protected readonly value = linkedSignal(() => this.user().name);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);
  protected readonly pending = signal(false);
  protected readonly changed = computed(
    () => this.value().trim().toUpperCase() !== this.user().name,
  );

  constructor() {
    effect(() => this.dirty.set(this.changed()));
  }

  // ========== Event handlers ==========
  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
    this.saved.set(false);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) return;
    const name = this.value().trim();
    this.saved.set(false);
    if (!USERNAME_RE.test(name)) return this.error.set(USERNAME_ERROR);
    this.error.set(null);
    this.pending.set(true);
    try {
      await firstValueFrom(this.profile.updateUsername(name));
      this.saved.set(true);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.pending.set(false);
    }
  }
}
