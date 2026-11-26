import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';
import { NavigationService } from '@shared/services/navigation.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { EMAIL_ERROR, PASSWORD_ERROR, USERNAME_ERROR } from '@/lib/auth-validation';
import { AuthFormComponent } from './auth-form';

describe('AuthFormComponent', () => {
  let fixture: ComponentFixture<AuthFormComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  const signIn = vi.fn();
  const signUp = vi.fn();
  const assign = vi.fn();

  function setup(inputs: Record<string, unknown> = {}): void {
    signIn.mockReset().mockReturnValue(of(undefined));
    signUp.mockReset().mockReturnValue(of({ needsConfirmation: true, email: 'kai@vault.gg' }));
    assign.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { signIn, signUp } },
        { provide: NavigationService, useValue: { assign } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AuthFormComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  const byId = (id: string) => el.querySelector(`#${id}`) as HTMLInputElement;
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;

  function type(id: string, value: string): void {
    byId(id).value = value;
    byId(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /** Envía y espera a que termine la petición (el envío es asíncrono). */
  async function submitAndWait(): Promise<void> {
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const failure = (status: number, message: string) =>
    throwError(() => new HttpErrorResponse({ status, error: { error: message } }));

  function click(text: string): void {
    button(text).click();
    fixture.detectChanges();
  }

  const alert = () => el.querySelector('[role="alert"]')?.textContent;
  const status = () => el.querySelector('[role="status"]')?.textContent;

  describe('iniciar sesión', () => {
    beforeEach(() => setup());

    it('empieza en INICIAR SESIÓN con usuario/correo y contraseña etiquetados', () => {
      expect(button('INICIAR SESIÓN').getAttribute('aria-pressed')).toBe('true');
      expect(button('CREAR CUENTA').getAttribute('aria-pressed')).toBe('false');
      expect(el.querySelector('label[for="auth-user"]')?.textContent).toBe('Usuario o correo');
      expect(el.querySelector('label[for="auth-pass"]')).toBeTruthy();
      expect(el.querySelector('#auth-email')).toBeNull();
    });

    it('sin datos → pide usuario o correo y marca el campo', () => {
      submit();
      expect(alert()).toBe('Introduce tu usuario o correo.');
      expect(byId('auth-user').getAttribute('aria-invalid')).toBe('true');
      expect(byId('auth-user').getAttribute('aria-describedby')).toBe('auth-error');
    });

    it('correo mal formado o usuario inválido → error de lib/', () => {
      type('auth-user', 'a@b');
      type('auth-pass', 'x');
      submit();
      expect(alert()).toBe(EMAIL_ERROR);
      type('auth-user', 'a b');
      submit();
      expect(alert()).toBe(USERNAME_ERROR);
    });

    it('sin contraseña → la pide y marca solo ese campo', () => {
      type('auth-user', 'px_kai');
      submit();
      expect(alert()).toBe('Introduce tu contraseña.');
      expect(byId('auth-pass').getAttribute('aria-invalid')).toBe('true');
      expect(byId('auth-user').getAttribute('aria-invalid')).toBe('false');
    });

    it('envío válido → llama a signIn con usuario y contraseña y recarga en /', async () => {
      type('auth-user', 'px_kai');
      type('auth-pass', 'x');
      await submitAndWait();
      expect(signIn).toHaveBeenCalledWith({ identifier: 'px_kai', password: 'x' });
      expect(assign).toHaveBeenCalledWith('/');
      expect(alert()).toBeUndefined();
    });

    it('entrada inválida no llama al servidor', () => {
      type('auth-user', 'ab');
      type('auth-pass', 'x');
      submit();
      expect(signIn).not.toHaveBeenCalled();
    });

    it('error del servidor → se muestra y no se navega', async () => {
      signIn.mockReturnValue(failure(401, 'Usuario o contraseña incorrectos.'));
      type('auth-user', 'px_kai');
      type('auth-pass', 'x');
      await submitAndWait();
      expect(alert()).toBe('Usuario o contraseña incorrectos.');
      expect(assign).not.toHaveBeenCalled();
      expect(button('ENTRAR AL VAULT').disabled).toBe(false);
    });

    it('error sin cuerpo → mensaje genérico', async () => {
      signIn.mockReturnValue(throwError(() => new Error('red')));
      type('auth-user', 'px_kai');
      type('auth-pass', 'x');
      await submitAndWait();
      expect(alert()).toContain('No se pudo completar');
    });

    it('mientras envía, el botón queda deshabilitado y no se reenvía', () => {
      signIn.mockReturnValue(new Observable(() => undefined));
      type('auth-user', 'px_kai');
      type('auth-pass', 'x');
      submit();
      expect(button('ENTRAR AL VAULT').disabled).toBe(true);
      submit();
      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it('Google y GitHub navegan (navegación completa) a /auth/oauth/:provider', () => {
      click('GOOGLE');
      expect(assign).toHaveBeenLastCalledWith('/auth/oauth/google');
      click('GITHUB');
      expect(assign).toHaveBeenLastCalledWith('/auth/oauth/github');
      http.expectNone(() => true);
    });

    it('los iconos de los botones sociales son decorativos', () => {
      expect(el.querySelectorAll('.social [aria-hidden="true"]').length).toBe(2);
    });

    it('JUGAR COMO INVITADO navega a /', () => {
      const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      click('JUGAR COMO INVITADO');
      expect(nav).toHaveBeenCalledWith('/');
    });

    it('«¿OLVIDASTE TU CONTRASEÑA?» abre la recuperación y volver regresa al acceso', () => {
      click('¿OLVIDASTE TU CONTRASEÑA?');
      expect(el.querySelector('app-forgot-password')).toBeTruthy();
      expect(el.querySelector('.auth-tabs')).toBeNull();
      click('VOLVER A INICIAR SESIÓN');
      expect(el.querySelector('app-forgot-password')).toBeNull();
      expect(el.querySelector('.auth-tabs')).toBeTruthy();
    });
  });

  describe('crear cuenta', () => {
    beforeEach(() => {
      setup();
      click('CREAR CUENTA');
    });

    it('muestra el campo de correo y oculta «¿Olvidaste tu contraseña?»', () => {
      expect(button('CREAR CUENTA').getAttribute('aria-pressed')).toBe('true');
      expect(el.querySelector('label[for="auth-user"]')?.textContent).toBe('Usuario');
      expect(byId('auth-email')).toBeTruthy();
      expect(button('¿OLVIDASTE')).toBeUndefined();
      expect(byId('auth-user').getAttribute('maxlength')).toBe('10');
    });

    it('usuario inválido → error de usuario', () => {
      type('auth-user', 'ab');
      type('auth-email', 'kai@vault.gg');
      type('auth-pass', 'Aa1!aaaa');
      submit();
      expect(alert()).toBe(USERNAME_ERROR);
      expect(byId('auth-user').getAttribute('aria-invalid')).toBe('true');
      expect(byId('auth-email').getAttribute('aria-invalid')).toBe('false');
      expect(byId('auth-pass').getAttribute('aria-invalid')).toBe('false');
    });

    it('correo inválido → error de correo y solo ese campo marcado', () => {
      type('auth-user', 'px_kai');
      type('auth-email', 'nope');
      type('auth-pass', 'Aa1!aaaa');
      submit();
      expect(alert()).toBe(EMAIL_ERROR);
      expect(byId('auth-email').getAttribute('aria-invalid')).toBe('true');
      expect(byId('auth-user').getAttribute('aria-invalid')).toBe('false');
    });

    it('contraseña débil → error de contraseña', () => {
      type('auth-user', 'px_kai');
      type('auth-email', 'kai@vault.gg');
      type('auth-pass', 'abc');
      submit();
      expect(alert()).toBe(PASSWORD_ERROR);
      expect(byId('auth-pass').getAttribute('aria-invalid')).toBe('true');
    });

    async function fillValid(): Promise<void> {
      type('auth-user', 'px_kai');
      type('auth-email', 'kai@vault.gg');
      type('auth-pass', 'Aa1!aaaa');
      await submitAndWait();
    }

    it('datos válidos → signUp y pantalla «Revisa tu correo» sin sesión', async () => {
      await fillValid();
      expect(signUp).toHaveBeenCalledWith({
        username: 'px_kai',
        email: 'kai@vault.gg',
        password: 'Aa1!aaaa',
      });
      expect(el.querySelector('h2')?.textContent).toBe('REVISA TU CORREO');
      expect(el.querySelector('[role="status"] strong')?.textContent).toBe('kai@vault.gg');
      expect(assign).not.toHaveBeenCalled();
    });

    it('VOLVER A INICIAR SESIÓN regresa al formulario en la pestaña de acceso', async () => {
      await fillValid();
      click('VOLVER A INICIAR SESIÓN');
      expect(el.querySelector('.auth-tabs')).toBeTruthy();
      expect(button('INICIAR SESIÓN').getAttribute('aria-pressed')).toBe('true');
    });

    it('registro que ya abre sesión → recarga en /', async () => {
      signUp.mockReturnValue(of({ needsConfirmation: false, email: 'kai@vault.gg' }));
      await fillValid();
      expect(assign).toHaveBeenCalledWith('/');
    });

    it('usuario ocupado → error del servidor en alerta', async () => {
      signUp.mockReturnValue(failure(409, 'Ese usuario ya existe.'));
      await fillValid();
      expect(alert()).toBe('Ese usuario ya existe.');
      expect(el.querySelector('.auth-tabs')).toBeTruthy();
    });

    it('datos inválidos no llaman al servidor', () => {
      type('auth-user', 'px_kai');
      type('auth-email', 'kai@vault.gg');
      type('auth-pass', 'abc');
      submit();
      expect(signUp).not.toHaveBeenCalled();
    });

    it('cambiar de pestaña limpia errores y avisos', () => {
      submit();
      expect(alert()).toBeTruthy();
      click('INICIAR SESIÓN');
      expect(alert()).toBeUndefined();
      expect(byId('auth-user').getAttribute('aria-invalid')).toBe('false');
    });
  });

  describe('avisos iniciales', () => {
    it('initialError se muestra como alerta', () => {
      setup({ initialError: 'Fallo OAuth' });
      expect(alert()).toBe('Fallo OAuth');
    });

    it('initialNotice se muestra como estado', () => {
      setup({ initialNotice: 'Email confirmado.' });
      expect(status()).toBe('Email confirmado.');
    });

    it('el error tiene prioridad sobre el aviso', () => {
      setup({ initialError: 'E', initialNotice: 'N' });
      expect(alert()).toBe('E');
      expect(status()).toBeUndefined();
    });
  });
});
