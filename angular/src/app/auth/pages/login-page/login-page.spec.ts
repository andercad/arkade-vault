import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import LoginPageComponent from './login-page';

describe('LoginPageComponent', () => {
  function render(inputs: Record<string, string> = {}): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LoginPageComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sin query muestra el formulario sin avisos', () => {
    const el = render();
    expect(el.querySelector('app-auth-form .auth-card')).toBeTruthy();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('?error=oauth muestra el fallo del callback', () => {
    expect(render({ error: 'oauth' }).querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo completar el acceso',
    );
  });

  it('?error con otro valor se ignora', () => {
    expect(render({ error: 'otro' }).querySelector('[role="alert"]')).toBeNull();
  });

  it('?confirmed=1 muestra «Email confirmado»', () => {
    expect(render({ confirmed: '1' }).querySelector('[role="status"]')?.textContent).toContain(
      'Email confirmado',
    );
  });

  it('?confirmed con otro valor se ignora', () => {
    expect(render({ confirmed: '0' }).querySelector('[role="status"]')).toBeNull();
  });
});
