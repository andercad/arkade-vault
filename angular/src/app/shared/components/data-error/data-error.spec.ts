import { TestBed } from '@angular/core/testing';
import { DataErrorComponent } from './data-error';

describe('DataErrorComponent', () => {
  function create(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(DataErrorComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra título y pista por defecto con role=alert', () => {
    const el = create();
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.classList.contains('data-error')).toBe(true);
    expect(el.querySelector('.de-title')?.textContent).toBe('NO SE PUDO CARGAR');
    expect(el.querySelector('.de-hint')?.textContent).toContain('Recarga');
  });

  it('acepta título y pista propios', () => {
    const el = create({ title: 'T', hint: 'H' });
    expect(el.querySelector('.de-title')?.textContent).toBe('T');
    expect(el.querySelector('.de-hint')?.textContent).toBe('H');
  });

  it('añade span-all con gridSpan', () => {
    expect(create({ gridSpan: true }).classList.contains('span-all')).toBe(true);
  });
});
