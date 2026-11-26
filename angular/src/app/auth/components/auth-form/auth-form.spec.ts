import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EMAIL_ERROR, PASSWORD_ERROR, USERNAME_ERROR } from '@/lib/auth-validation';
import { AuthFormComponent } from './auth-form';

describe('AuthFormComponent', () => {
  let fixture: ComponentFixture<AuthFormComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  function setup(inputs: Record<string, unknown> = {}): void {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

    it('envío válido → «Disponible próximamente», sin error y sin petición HTTP', () => {
      type('auth-user', 'px_kai');
      type('auth-pass', 'x');
      submit();
      expect(status()).toContain('Disponible próximamente');
      expect(alert()).toBeUndefined();
      http.expectNone(() => true);
    });

    it('Google y GitHub avisan «Disponible próximamente» sin petición', () => {
      click('GOOGLE');
      expect(status()).toContain('Disponible próximamente');
      click('GITHUB');
      expect(status()).toContain('Disponible próximamente');
      http.expectNone(() => true);
    });

    it('los iconos de los botones sociales son decorativos', () => {
      expect(el.querySelectorAll('.social [aria-hidden="true"]').length).toBe(2);
    });

    it('JUGAR COMO INVITADO navega a /juegos', () => {
      const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      click('JUGAR COMO INVITADO');
      expect(nav).toHaveBeenCalledWith('/juegos');
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

    it('datos válidos → «Disponible próximamente» sin petición', () => {
      type('auth-user', 'px_kai');
      type('auth-email', 'kai@vault.gg');
      type('auth-pass', 'Aa1!aaaa');
      submit();
      expect(status()).toContain('Disponible próximamente');
      expect(alert()).toBeUndefined();
      http.expectNone(() => true);
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
