import { DOCUMENT, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AvatarComponent } from '@shared/components/avatar/avatar';
import { AuthService } from '@shared/services/auth.service';
import { NavigationService } from '@shared/services/navigation.service';
import { SessionService } from '@shared/services/session.service';
import { DangerZoneComponent } from '../../components/danger-zone/danger-zone';
import { PasswordSectionComponent } from '../../components/password-section/password-section';
import { ProfileFormComponent } from '../../components/profile-form/profile-form';

/**
 * Ruta `/perfil` (cliente, protegida por `authGuard` y por el 302 de Express): avatar y usuario,
 * formulario de usuario, cambio de contraseña (solo con identidad email), SALIR, CERRAR SESIÓN y
 * zona peligrosa. Solo orquesta: cada sección hace su trabajo.
 */
@Component({
  selector: 'app-profile-page',
  imports: [AvatarComponent, ProfileFormComponent, PasswordSectionComponent, DangerZoneComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfilePageComponent {
  private readonly session = inject(SessionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly navigation = inject(NavigationService);
  private readonly document = inject(DOCUMENT);

  // ========== State ==========
  protected readonly user = this.session.user;
  protected readonly loading = this.session.loading;
  /** Hay un usuario sin guardar en el formulario. */
  protected readonly dirty = signal(false);

  // ========== Event handlers ==========
  /** Sale sin guardar: página anterior, o la home si no hay. */
  protected leave(): void {
    if ((this.document.defaultView?.history.length ?? 0) > 1) this.location.back();
    else void this.router.navigateByUrl('/');
  }

  protected async logout(): Promise<void> {
    await firstValueFrom(this.auth.signOut());
    await this.router.navigateByUrl('/');
  }

  /** Cuenta borrada: navegación completa para releer las cookies ya limpias. */
  protected onDeleted(): void {
    this.navigation.assign('/?cuenta=eliminada');
  }
}
