import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDeletedNoticeComponent } from './account-deleted-notice';

describe('AccountDeletedNoticeComponent', () => {
  let fixture: ComponentFixture<AccountDeletedNoticeComponent>;
  let el: HTMLElement;

  function render(account?: string | null): void {
    fixture = TestBed.createComponent(AccountDeletedNoticeComponent);
    if (account !== undefined) fixture.componentRef.setInput('account', account);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  afterEach(() => vi.useRealTimers());

  it('con ?cuenta=eliminada muestra el aviso con role=status', () => {
    render('eliminada');
    const notice = el.querySelector('[role="status"]')!;
    expect(notice.textContent).toContain(
      'Cuenta eliminada. Tus datos y puntuaciones se han borrado.',
    );
  });

  it.each([[undefined], [null], ['otra'], ['']])('con %j no pinta nada', (value) => {
    render(value);
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('OK descarta el aviso', () => {
    render('eliminada');
    el.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('se descarta solo a los 8 s y limpia el temporizador al destruirse', () => {
    vi.useFakeTimers();
    render('eliminada');
    vi.advanceTimersByTime(7999);
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')).toBeNull();

    render('eliminada');
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    fixture.destroy();
    expect(clear).toHaveBeenCalled();
  });
});
