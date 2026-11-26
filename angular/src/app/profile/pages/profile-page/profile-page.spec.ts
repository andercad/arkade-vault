import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import type { SessionUser } from '@shared/models/session';
import { AuthService } from '@shared/services/auth.service';
import { NavigationService } from '@shared/services/navigation.service';
import { ProfileService } from '@profile/services/profile.service';
import { SessionService } from '@shared/services/session.service';
import ProfilePageComponent from './profile-page';

const USER: SessionUser = { id: 'u1', name: 'ANDER', avatarUrl: null, hasPassword: true };

describe('ProfilePageComponent', () => {
  const user = signal<SessionUser | null>(USER);
  const loading = signal(false);
  const signOut = vi.fn();
  const assign = vi.fn();
  const back = vi.fn();
  let fixture: ComponentFixture<ProfilePageComponent>;
  let el: HTMLElement;
  let router: Router;

  function render(): void {
    signOut.mockReset().mockReturnValue(of(undefined));
    assign.mockReset();
    back.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: { user, loading } },
        { provide: AuthService, useValue: { signOut } },
        { provide: ProfileService, useValue: {} },
        { provide: NavigationService, useValue: { assign } },
        { provide: Location, useValue: { back } },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(ProfilePageComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const byText = (text: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.trim().includes(text),
    )!;

  beforeEach(() => {
    user.set(USER);
    loading.set(false);
  });

  it('muestra avatar, usuario como h1 y el subtítulo', () => {
    render();
    expect(el.querySelector('app-avatar')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toBe('ANDER');
    expect(el.textContent).toContain('PERFIL DE JUGADOR');
    expect(el.querySelector('app-profile-form')).toBeTruthy();
    expect(el.querySelector('app-danger-zone')).toBeTruthy();
  });

  it('con identidad email muestra CAMBIAR CONTRASEÑA', () => {
    render();
    expect(el.querySelector('app-password-section')).toBeTruthy();
  });

  it('cuenta OAuth sin contraseña: no muestra CAMBIAR CONTRASEÑA', () => {
    user.set({ ...USER, hasPassword: false });
    render();
    expect(el.querySelector('app-password-section')).toBeNull();
    expect(el.textContent).not.toContain('CAMBIAR CONTRASEÑA');
  });

  it('mientras carga la sesión muestra «Cargando perfil…»', () => {
    user.set(null);
    loading.set(true);
    render();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Cargando perfil');
    expect(el.querySelector('app-profile-form')).toBeNull();
  });

  it('SALIR sin cambios vuelve atrás; con cambios se rotula SALIR SIN GUARDAR', () => {
    render();
    expect(byText('SALIR').textContent?.trim()).toBe('SALIR');
    const input = el.querySelector<HTMLInputElement>('#profile-username')!;
    input.value = 'otro';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(byText('SALIR').textContent?.trim()).toBe('SALIR SIN GUARDAR');
  });

  it('SALIR sin historial (pestaña nueva) va a la home', () => {
    render();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    byText('SALIR').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(back).not.toHaveBeenCalled();
  });

  it('SALIR con historial vuelve a la página anterior', () => {
    render();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    byText('SALIR').click();
    expect(back).toHaveBeenCalled();
  });

  it('CERRAR SESIÓN cierra la sesión y va a la home', async () => {
    render();
    byText('CERRAR SESIÓN').click();
    await fixture.whenStable();
    expect(signOut).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('al borrar la cuenta hace navegación completa a /?cuenta=eliminada', () => {
    render();
    fixture.componentInstance['onDeleted']();
    expect(assign).toHaveBeenCalledWith('/?cuenta=eliminada');
  });
});
