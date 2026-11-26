import { TestBed } from '@angular/core/testing';
import { LoadingComponent } from './loading';

describe('LoadingComponent', () => {
  it('muestra CARGANDO… como estado anunciable', () => {
    const fixture = TestBed.createComponent(LoadingComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent?.trim()).toBe('CARGANDO…');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.classList.contains('pixel')).toBe(true);
  });
});
