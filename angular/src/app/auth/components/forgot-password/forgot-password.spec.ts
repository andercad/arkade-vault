import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '@shared/services/auth.service';
import { Observable, of, throwError } from 'rxjs';
import { EMAIL_ERROR } from '@/lib/auth-validation';
import { ForgotPasswordComponent } from './forgot-password';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let el: HTMLElement;
  const forgotPassword = vi.fn();

  beforeEach(() => {
    forgotPassword.mockReset().mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { forgotPassword } }],
    });
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  const input = () => el.querySelector('#forgot-email') as HTMLInputElement;

  async function submit(email: string): Promise<void> {
    input().value = email;
    input().dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('pinta el título, el campo con label y los botones', () => {
    expect(el.querySelector('h2')?.textContent).toBe('RECUPERAR CONTRASEÑA');
    expect(el.querySelector('label[for="forgot-email"]')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain('ENVIAR ENLACE');
  });

  it('correo mal formado → error con aria-invalid y aria-describedby, sin petición', async () => {
    await submit('no-es-correo');
    expect(el.querySelector('[role="alert"]')?.textContent).toBe(EMAIL_ERROR);
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe('forgot-error');
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('correo vacío → error y sin petición', async () => {
    await submit('');
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('correo válido → pide el enlace y muestra «REVISA TU CORREO» (role=status)', async () => {
    await submit('  kai@vault.gg  ');
    expect(forgotPassword).toHaveBeenCalledWith('kai@vault.gg');
    expect(el.querySelector('h2')?.textContent).toBe('REVISA TU CORREO');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('kai@vault.gg');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('error del servidor → muestra su mensaje y conserva el formulario', async () => {
    forgotPassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { error: 'Demasiados correos enviados. Inténtalo más tarde.' },
          }),
      ),
    );
    await submit('kai@vault.gg');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Demasiados correos');
    expect(el.querySelector('form')).toBeTruthy();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('error sin cuerpo → mensaje genérico', async () => {
    forgotPassword.mockReturnValue(throwError(() => new Error('red')));
    await submit('kai@vault.gg');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo completar');
  });

  it('mientras envía deshabilita campo y botón y no reenvía', () => {
    forgotPassword.mockReturnValue(new Observable(() => undefined));
    input().value = 'kai@vault.gg';
    input().dispatchEvent(new Event('input'));
    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(input().disabled).toBe(true);
    form.dispatchEvent(new Event('submit'));
    expect(forgotPassword).toHaveBeenCalledTimes(1);
  });

  it('VOLVER A INICIAR SESIÓN emite back', () => {
    const back = vi.fn();
    fixture.componentInstance.back.subscribe(back);
    (el.querySelector('button.back') as HTMLButtonElement).click();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
