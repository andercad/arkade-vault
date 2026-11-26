import { TestBed } from '@angular/core/testing';
import { SilhouettesComponent } from './silhouettes';

describe('SilhouettesComponent', () => {
  it('pinta 8 siluetas dentro de un contenedor oculto a lectores de pantalla', () => {
    const fixture = TestBed.createComponent(SilhouettesComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.home-silos')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('svg.silo').length).toBe(8);
  });
});
