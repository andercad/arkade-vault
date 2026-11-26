import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SessionUser } from '@shared/models/session';
import { AccountMenuComponent } from './account-menu';

const USER: SessionUser = { id: 'u1', name: 'ANDER', avatarUrl: null, hasPassword: true };

describe('AccountMenuComponent', () => {
  let fixture: ComponentFixture<AccountMenuComponent>;
  let el: HTMLElement;
  let signedOut: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'perfil', children: [] }])] });
    fixture = TestBed.createComponent(AccountMenuComponent);
    fixture.componentRef.setInput('user', USER);
    signedOut = vi.fn<() => void>();
    fixture.componentInstance.signedOut.subscribe(signedOut);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  const trigger = () => el.querySelector('.account-trigger') as HTMLButtonElement;
  const menu = () => el.querySelector('[role="menu"]');
  const items = () => Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]'));

  async function open(): Promise<void> {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('cerrado: botón con nombre accesible, aria-haspopup y aria-expanded=false', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Cuenta de ANDER');
    expect(el.querySelector('.account-name')?.textContent).toBe('ANDER');
    expect(menu()).toBeNull();
  });

  it('al pulsar abre el menú con Perfil y Cerrar sesión y enfoca el primer elemento', async () => {
    await open();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(items().map((i) => i.textContent?.trim())).toEqual(['Perfil', 'Cerrar sesión']);
    expect(items()[0].getAttribute('href')).toBe('/perfil');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('pulsar de nuevo el botón cierra el menú', async () => {
    await open();
    trigger().click();
    fixture.detectChanges();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('Esc cierra y devuelve el foco al botón', async () => {
    document.body.append(el);
    await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    el.remove();
  });

  it('un clic fuera cierra; uno dentro no', async () => {
    await open();
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(menu()).not.toBeNull();

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('flechas, Home y End mueven el foco entre elementos', async () => {
    document.body.append(el);
    await open();
    const menuEl = menu() as HTMLElement;
    const press = (key: string) =>
      menuEl.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

    press('ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    press('ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    press('ArrowUp');
    expect(document.activeElement).toBe(items()[1]);
    press('Home');
    expect(document.activeElement).toBe(items()[0]);
    press('End');
    expect(document.activeElement).toBe(items()[1]);
    el.remove();
  });

  it('Cerrar sesión cierra el menú y emite signedOut', async () => {
    await open();
    items()[1].click();
    fixture.detectChanges();
    expect(signedOut).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it('elegir Perfil cierra el menú', async () => {
    await open();
    items()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(menu()).toBeNull();
  });
});
