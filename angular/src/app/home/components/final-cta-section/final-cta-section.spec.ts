import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FinalCtaSectionComponent } from './final-cta-section';

describe('FinalCtaSectionComponent', () => {
  it('pinta el título, el botón hacia la biblioteca y la nota', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(FinalCtaSectionComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('section.home-final.reveal')).toBeTruthy();
    expect(el.querySelector('h2')?.textContent).toBe('¿LISTO PARA JUGAR?');
    expect(el.querySelector('a.final-cta')?.getAttribute('href')).toBe('/juegos');
    expect(el.querySelector('.final-tag')?.textContent).toContain('Gratis');
  });
});
