import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMAIL_ERROR } from '@/lib/auth-validation';
import { ForgotPasswordComponent } from './forgot-password';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const input = () => el.querySelector('#forgot-email') as HTMLInputElement;

  function submit(email: string): void {
    input().value = email;
    input().dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('pinta el título, el campo con label y los botones', () => {
    expect(el.querySelector('h2')?.textContent).toBe('RECUPERAR CONTRASEÑA');
    expect(el.querySelector('label[for="forgot-email"]')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain('ENVIAR ENLACE');
  });

  it('correo vacío o mal formado → error con aria-invalid y aria-describedby', () => {
    submit('no-es-correo');
    expect(el.querySelector('[role="alert"]')?.textContent).toBe(EMAIL_ERROR);
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe('forgot-error');
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('correo válido → «Disponible próximamente» sin error y sin petición HTTP', () => {
    submit('  kai@vault.gg  ');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Disponible próximamente');
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(input().getAttribute('aria-invalid')).toBe('false');
    http.expectNone(() => true);
  });

  it('un error posterior retira el aviso', () => {
    submit('kai@vault.gg');
    submit('');
    expect(el.querySelector('[role="status"]')).toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('VOLVER A INICIAR SESIÓN emite back', () => {
    const back = vi.fn();
    fixture.componentInstance.back.subscribe(back);
    (el.querySelector('button.back') as HTMLButtonElement).click();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
