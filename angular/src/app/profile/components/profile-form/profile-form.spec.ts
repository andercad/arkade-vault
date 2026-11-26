import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import type { SessionUser } from '@shared/models/session';
import { ProfileService } from '@shared/services/profile.service';
import { ProfileFormComponent } from './profile-form';

const USER: SessionUser = { id: 'u1', name: 'ANDER', avatarUrl: null, hasPassword: true };

describe('ProfileFormComponent', () => {
  const updateUsername = vi.fn();
  let fixture: ComponentFixture<ProfileFormComponent>;
  let el: HTMLElement;

  function render(user = USER): void {
    updateUsername.mockReset().mockReturnValue(of('NUEVO'));
    TestBed.configureTestingModule({
      providers: [{ provide: ProfileService, useValue: { updateUsername } }],
    });
    fixture = TestBed.createComponent(ProfileFormComponent);
    fixture.componentRef.setInput('user', user);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const input = () => el.querySelector<HTMLInputElement>('input')!;
  const button = () => el.querySelector<HTMLButtonElement>('button')!;
  const type = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('muestra el usuario actual con maxlength 10 y el botón deshabilitado sin cambios', () => {
    render();
    expect(input().value).toBe('ANDER');
    expect(input().maxLength).toBe(10);
    expect(button().disabled).toBe(true);
    expect(el.querySelector('label')?.getAttribute('for')).toBe(input().id);
  });

  it('al escribir otro usuario habilita el botón y avisa con dirty', () => {
    render();
    expect(fixture.componentInstance.dirty()).toBe(false);
    type('nuevo');
    expect(button().disabled).toBe(false);
    expect(fixture.componentInstance.dirty()).toBe(true);
    type('ander');
    expect(fixture.componentInstance.dirty()).toBe(false);
  });

  it('usuario inválido → error con aria-invalid/describedby y sin petición', async () => {
    render();
    type('a b');
    await submit();
    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('3 a 10 caracteres');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe(alert.id);
    expect(updateUsername).not.toHaveBeenCalled();
  });

  it('envía el usuario recortado y confirma con role=status', async () => {
    render();
    type(' nuevo ');
    await submit();
    expect(updateUsername).toHaveBeenCalledWith('nuevo');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Usuario actualizado');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('muestra el error del servidor', async () => {
    render();
    updateUsername.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { error: 'Ese usuario ya existe.' } }),
      ),
    );
    type('otro');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Ese usuario ya existe.');
    expect(button().disabled).toBe(false);
  });

  it('si el usuario de la sesión cambia, el campo vuelve a él', () => {
    render();
    type('borrador');
    fixture.componentRef.setInput('user', { ...USER, name: 'NUEVO' });
    fixture.detectChanges();
    expect(input().value).toBe('NUEVO');
  });
});
