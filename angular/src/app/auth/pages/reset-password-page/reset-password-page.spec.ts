import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';
import ResetPasswordPageComponent from './reset-password-page';

describe('ResetPasswordPageComponent', () => {
  const recover = vi.fn();

  function render(inputs: Record<string, string> = {}): HTMLElement {
    recover.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { recover } }],
    });
    const fixture = TestBed.createComponent(ResetPasswordPageComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sin ?code muestra el error y el enlace a /login', () => {
    const el = render();
    expect(el.querySelector('app-reset-password-form [role="alert"]')?.textContent).toContain(
      'El enlace no es válido',
    );
    expect(el.querySelector('form')).toBeNull();
  });

  it('con ?code muestra el formulario sin consumir el código', () => {
    const el = render({ code: 'abc' });
    expect(el.querySelector('form')).toBeTruthy();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(recover).not.toHaveBeenCalled();
  });
});
