import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProfileService } from '@profile/services/profile.service';
import { PasswordSectionComponent } from './password-section';

describe('PasswordSectionComponent', () => {
  const changePassword = vi.fn();
  let fixture: ComponentFixture<PasswordSectionComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    changePassword.mockReset().mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [{ provide: ProfileService, useValue: { changePassword } }],
    });
    fixture = TestBed.createComponent(PasswordSectionComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  const byText = (text: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;
  const click = (text: string) => {
    byText(text).click();
    fixture.detectChanges();
  };
  const fill = (id: string, value: string) => {
    const field = el.querySelector<HTMLInputElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  };
  const fillAll = () => {
    fill('pw-current', 'Actual1!x');
    fill('pw-new', 'Nueva2@yz');
    fill('pw-repeat', 'Nueva2@yz');
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('empieza plegada: solo el botón CAMBIAR CONTRASEÑA', () => {
    expect(el.querySelector('form')).toBeNull();
    expect(byText('CAMBIAR CONTRASEÑA')).toBeTruthy();
  });

  it('se despliega con tres campos con label y autocomplete correctos', () => {
    click('CAMBIAR CONTRASEÑA');
    const fields = [...el.querySelectorAll<HTMLInputElement>('input')];
    expect(fields.map((f) => f.getAttribute('autocomplete'))).toEqual([
      'current-password',
      'new-password',
      'new-password',
    ]);
    for (const f of fields) {
      expect(el.querySelector(`label[for="${f.id}"]`)).toBeTruthy();
      expect(f.type).toBe('password');
    }
  });

  it('CANCELAR la pliega sin enviar', () => {
    click('CAMBIAR CONTRASEÑA');
    click('CANCELAR');
    expect(el.querySelector('form')).toBeNull();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('envía los tres valores, se cierra y avisa con role=status', async () => {
    click('CAMBIAR CONTRASEÑA');
    fillAll();
    await submit();
    expect(changePassword).toHaveBeenCalledWith({
      current: 'Actual1!x',
      password: 'Nueva2@yz',
      repeat: 'Nueva2@yz',
    });
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Contraseña actualizada.');
  });

  it('error del servidor: role=alert enlazado, sigue abierta', async () => {
    changePassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { error: 'La contraseña actual no es correcta.' },
          }),
      ),
    );
    click('CAMBIAR CONTRASEÑA');
    fillAll();
    await submit();
    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('La contraseña actual no es correcta.');
    expect(el.querySelector('#pw-current')?.getAttribute('aria-describedby')).toBe(alert.id);
    expect(el.querySelector('form')).toBeTruthy();
  });

  it('error sin cuerpo: mensaje genérico', async () => {
    changePassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    click('CAMBIAR CONTRASEÑA');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo completar');
  });
});
