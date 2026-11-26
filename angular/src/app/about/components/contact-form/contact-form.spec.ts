import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONTACT_LIMITS } from '@/lib/contact';
import { ContactFormComponent } from './contact-form';

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ContactFormComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  const field = (id: string) => el.querySelector(`#contact-${id}`) as HTMLInputElement;

  function fill(values: { name?: string; email?: string; message?: string }): void {
    for (const [k, v] of Object.entries(values)) {
      field(k).value = v;
      field(k).dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  }

  function submit(): void {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  const VALID = { name: 'Kai', email: 'kai@vault.gg', message: 'Hola' };

  it('cada campo tiene su label asociada', () => {
    for (const id of ['name', 'email', 'message']) {
      expect(el.querySelector(`label[for="contact-${id}"]`)).toBeTruthy();
    }
  });

  it('el honeypot está oculto a lectores y fuera del orden de tabulación', () => {
    expect(el.querySelector('.hp-field')?.getAttribute('aria-hidden')).toBe('true');
    expect(field('website').getAttribute('tabindex')).toBe('-1');
  });

  it('formulario vacío → «Completa todos los campos», aria-invalid en los tres y temblor', () => {
    vi.useFakeTimers();
    submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Completa todos los campos.');
    for (const id of ['name', 'email', 'message']) {
      expect(field(id).getAttribute('aria-invalid')).toBe('true');
      expect(field(id).getAttribute('aria-describedby')).toBe('contact-error');
    }
    expect(el.querySelector('form')?.classList.contains('shake')).toBe(true);
    vi.advanceTimersByTime(400);
    fixture.detectChanges();
    expect(el.querySelector('form')?.classList.contains('shake')).toBe(false);
  });

  it('solo marca como inválidos los campos que fallan', () => {
    fill({ name: 'Kai', email: '', message: 'Hola' });
    submit();
    expect(field('name').getAttribute('aria-invalid')).toBe('false');
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(field('name').hasAttribute('aria-describedby')).toBe(false);
  });

  it('correo mal formado → error de correo, sin temblor', () => {
    fill({ ...VALID, email: 'no-es-un-correo' });
    submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'El correo electrónico no es válido.',
    );
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('form')?.classList.contains('shake')).toBe(false);
  });

  it('nombre y mensaje demasiado largos → error y campo marcado', () => {
    fill({ ...VALID, name: 'a'.repeat(CONTACT_LIMITS.name + 1) });
    submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('El nombre no puede superar');
    expect(field('name').getAttribute('aria-invalid')).toBe('true');
    fill({ name: 'Kai', message: 'm'.repeat(CONTACT_LIMITS.message + 1) });
    submit();
    expect(field('message').getAttribute('aria-invalid')).toBe('true');
    expect(field('name').getAttribute('aria-invalid')).toBe('false');
  });

  it('envío válido → POST con honeypot vacío, «enviado» con el nombre y sin errores', () => {
    fill(VALID);
    submit();
    const req = http.expectOne('/api/contact');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ...VALID, website: '' });
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain('ENVIANDO');
    expect(el.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('GRACIAS, KAI');
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('#contact-name')).toBeNull();
  });

  it('un segundo envío mientras se envía no repite la petición', () => {
    fill(VALID);
    submit();
    submit();
    http.expectOne('/api/contact').flush(null, { status: 204, statusText: 'No Content' });
  });

  it('el honeypot rellenado viaja en el cuerpo', () => {
    fill(VALID);
    const hp = field('website');
    hp.value = 'http://spam.test';
    hp.dispatchEvent(new Event('input'));
    submit();
    expect(http.expectOne('/api/contact').request.body.website).toBe('http://spam.test');
  });

  it('«enviar otro mensaje» devuelve el formulario vacío', () => {
    fill(VALID);
    submit();
    http.expectOne('/api/contact').flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    (el.querySelector('button.ghost') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(field('name').value).toBe('');
    expect(field('message').value).toBe('');
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('error del servidor → mensaje en role=alert, conserva los datos y reactiva el botón', () => {
    fill(VALID);
    submit();
    http
      .expectOne('/api/contact')
      .flush({ error: 'No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo enviar el mensaje');
    expect(field('name').value).toBe('Kai');
    expect(el.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
  });

  it('error sin cuerpo (red) → mensaje genérico', () => {
    fill(VALID);
    submit();
    http.expectOne('/api/contact').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('formulario inválido no hace petición', () => {
    submit();
    http.expectNone('/api/contact');
  });

  it('corregir tras un error de validación limpia el error', () => {
    submit();
    fill(VALID);
    submit();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    http.expectOne('/api/contact').flush(null, { status: 204, statusText: 'No Content' });
  });
});
