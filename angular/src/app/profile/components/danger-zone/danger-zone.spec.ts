import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProfileService } from '@shared/services/profile.service';
import { DangerZoneComponent } from './danger-zone';

describe('DangerZoneComponent', () => {
  const deleteAccount = vi.fn();
  const deleted = vi.fn();
  let fixture: ComponentFixture<DangerZoneComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    deleteAccount.mockReset().mockReturnValue(of(undefined));
    deleted.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ProfileService, useValue: { deleteAccount } }],
    });
    fixture = TestBed.createComponent(DangerZoneComponent);
    fixture.componentRef.setInput('username', 'ANA');
    fixture.componentInstance.deleted.subscribe(deleted);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  const trigger = () => el.querySelector<HTMLButtonElement>('button.btn.red')!;
  const dialog = () => el.querySelector<HTMLElement>('[role="dialog"]');
  const input = () => el.querySelector<HTMLInputElement>('#delete-confirm')!;
  const open = async () => {
    trigger().focus();
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const type = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    dialog()!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const key = (k: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', {
      key: k,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    (document.activeElement ?? document.body).dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  it('muestra ZONA PELIGROSA y el botón; el modal empieza cerrado', () => {
    expect(el.textContent).toContain('ZONA PELIGROSA');
    expect(trigger().textContent).toContain('ELIMINAR CUENTA');
    expect(dialog()).toBeNull();
  });

  it('abre un diálogo modal con nombre accesible y foco en el campo', async () => {
    document.body.append(el);
    await open();
    const d = dialog()!;
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.querySelector(`#${d.getAttribute('aria-labelledby')}`)?.textContent).toContain(
      'ELIMINAR CUENTA',
    );
    expect(el.querySelector('label[for="delete-confirm"]')).toBeTruthy();
    expect(document.activeElement).toBe(input());
    el.remove();
  });

  it('Esc cierra y devuelve el foco al botón que lo abrió', async () => {
    document.body.append(el);
    await open();
    key('Escape');
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    el.remove();
  });

  it('CANCELAR y el fondo cierran', async () => {
    await open();
    [...el.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes('CANCELAR'))!
      .click();
    fixture.detectChanges();
    expect(dialog()).toBeNull();

    await open();
    el.querySelector('.modal-bd')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(dialog()).toBeNull();
  });

  it('un mousedown dentro del modal no lo cierra', async () => {
    await open();
    dialog()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(dialog()).toBeTruthy();
  });

  it('Tab desde el último elemento vuelve al primero y Shift+Tab desde el primero va al último', async () => {
    document.body.append(el);
    await open();
    const buttons = el.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    const first = input();
    const last = buttons[buttons.length - 1];
    last.focus();
    expect(key('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    expect(key('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    el.remove();
  });

  it('confirmación que no coincide: error al pulsar ELIMINAR, sin petición', async () => {
    await open();
    type('otro');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('El usuario no coincide.');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(deleted).not.toHaveBeenCalled();
  });

  it('confirmación vacía también da error', async () => {
    await open();
    await submit();
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('con el usuario correcto (sin importar mayúsculas) borra y emite deleted', async () => {
    await open();
    type(' ana ');
    await submit();
    expect(deleteAccount).toHaveBeenCalledWith(' ana ');
    expect(deleted).toHaveBeenCalledOnce();
  });

  it('error del servidor: lo muestra y permite reintentar', async () => {
    deleteAccount.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Fallo.' } })),
    );
    await open();
    type('ANA');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Fallo.');
    expect(deleted).not.toHaveBeenCalled();
    const buttons = el.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    expect([...buttons].every((b) => !b.disabled)).toBe(true);
  });
});
