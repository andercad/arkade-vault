import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';
import { NavigationService } from '@shared/services/navigation.service';
import { Observable, of, throwError } from 'rxjs';
import { PASSWORD_ERROR } from '@/lib/auth-validation';
import { ResetPasswordFormComponent } from './reset-password-form';

describe('ResetPasswordFormComponent', () => {
  let fixture: ComponentFixture<ResetPasswordFormComponent>;
  let el: HTMLElement;
  const recover = vi.fn();
  const assign = vi.fn();

  function setup(code: string | null): void {
    recover.mockReset().mockReturnValue(of(undefined));
    assign.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { recover } },
        { provide: NavigationService, useValue: { assign } },
      ],
    });
    fixture = TestBed.createComponent(ResetPasswordFormComponent);
    fixture.componentRef.setInput('code', code);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const byId = (id: string) => el.querySelector(`#${id}`) as HTMLInputElement;

  function type(id: string, value: string): void {
    byId(id).value = value;
    byId(id).dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const alert = () => el.querySelector('[role="alert"]')?.textContent?.trim();

  describe('sin código', () => {
    it.each([null, ''])('code %j → error y enlace a /login, sin formulario', (code) => {
      setup(code);
      expect(alert()).toContain('El enlace no es válido');
      expect(el.querySelector('form')).toBeNull();
      const link = el.querySelector('a.btn') as HTMLAnchorElement;
      expect(link.textContent).toContain('IR A INICIAR SESIÓN');
      expect(link.getAttribute('href')).toBe('/login');
    });
  });

  describe('con código', () => {
    beforeEach(() => setup('abc'));

    it('pinta el formulario con labels y no llama al servidor al cargar', () => {
      expect(el.querySelector('label[for="reset-pass"]')?.textContent).toBe('Nueva contraseña');
      expect(el.querySelector('label[for="reset-repeat"]')?.textContent).toBe(
        'Repite la contraseña',
      );
      expect(alert()).toBeUndefined();
      expect(recover).not.toHaveBeenCalled();
    });

    it('contraseña débil → error con aria-invalid/aria-describedby y sin petición', async () => {
      type('reset-pass', 'x');
      type('reset-repeat', 'x');
      await submit();
      expect(alert()).toBe(PASSWORD_ERROR);
      expect(byId('reset-pass').getAttribute('aria-invalid')).toBe('true');
      expect(byId('reset-pass').getAttribute('aria-describedby')).toBe('reset-error');
      expect(byId('reset-repeat').getAttribute('aria-invalid')).toBe('false');
      expect(recover).not.toHaveBeenCalled();
    });

    it('no coinciden → error en el campo de repetición', async () => {
      type('reset-pass', 'Aa1!aaaa');
      type('reset-repeat', 'Aa1!aaab');
      await submit();
      expect(alert()).toBe('Las contraseñas no coinciden.');
      expect(byId('reset-repeat').getAttribute('aria-invalid')).toBe('true');
      expect(byId('reset-repeat').getAttribute('aria-describedby')).toBe('reset-error');
      expect(recover).not.toHaveBeenCalled();
    });

    it('válido → envía código y contraseña y navega a /', async () => {
      type('reset-pass', 'Aa1!aaaa');
      type('reset-repeat', 'Aa1!aaaa');
      await submit();
      expect(recover).toHaveBeenCalledWith('abc', 'Aa1!aaaa');
      expect(assign).toHaveBeenCalledWith('/');
      expect(alert()).toBeUndefined();
    });

    it('error del servidor → muestra su mensaje y rehabilita el formulario', async () => {
      recover.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { error: 'La nueva contraseña debe ser distinta de la anterior.' },
            }),
        ),
      );
      type('reset-pass', 'Aa1!aaaa');
      type('reset-repeat', 'Aa1!aaaa');
      await submit();
      expect(alert()).toContain('distinta de la anterior');
      expect(assign).not.toHaveBeenCalled();
      expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    });

    it('error sin cuerpo → mensaje genérico', async () => {
      recover.mockReturnValue(throwError(() => new Error('red')));
      type('reset-pass', 'Aa1!aaaa');
      type('reset-repeat', 'Aa1!aaaa');
      await submit();
      expect(alert()).toContain('No se pudo completar');
    });

    it('mientras envía, deshabilita el botón y no reenvía', () => {
      recover.mockReturnValue(new Observable(() => undefined));
      type('reset-pass', 'Aa1!aaaa');
      type('reset-repeat', 'Aa1!aaaa');
      const form = el.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('GUARDANDO');
      form.dispatchEvent(new Event('submit'));
      expect(recover).toHaveBeenCalledTimes(1);
    });
  });
});
