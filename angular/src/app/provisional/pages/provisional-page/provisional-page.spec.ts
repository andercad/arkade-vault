import { TestBed } from '@angular/core/testing';
import ProvisionalPageComponent from './provisional-page';

describe('ProvisionalPageComponent', () => {
  it('muestra el nombre recibido como encabezado', () => {
    const fixture = TestBed.createComponent(ProvisionalPageComponent);
    fixture.componentRef.setInput('name', 'INICIO');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toBe('INICIO');
    expect(el.querySelector('section')?.getAttribute('aria-labelledby')).toBe('pv-title');
  });
});
