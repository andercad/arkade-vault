import { TestBed } from '@angular/core/testing';
import { FEATURES } from '@/lib/home';
import { FeaturesSectionComponent } from './features-section';

describe('FeaturesSectionComponent', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(FeaturesSectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('es una sección reveal con encabezado h2', () => {
    const el = render();
    expect(el.querySelector('section.home-section.reveal')).toBeTruthy();
    expect(el.querySelector('h2')?.textContent).toBe('¿POR QUÉ ARCADE VAULT?');
  });

  it('una tarjeta por característica con su color, icono, título y texto', () => {
    const cards = render().querySelectorAll('.feature-card');
    expect(cards.length).toBe(FEATURES.length);
    FEATURES.forEach((f, i) => {
      expect(cards[i].classList.contains(f.color)).toBe(true);
      expect(cards[i].querySelector('svg.ft-icon')).toBeTruthy();
      expect(cards[i].querySelector('.ft-title')?.textContent).toBe(f.title);
      expect(cards[i].querySelector('.ft-desc')?.textContent).toBe(f.desc);
    });
  });

  it('escalona la transición 80 ms por tarjeta', () => {
    const cards = render().querySelectorAll<HTMLElement>('.feature-card');
    expect(cards[0].style.transitionDelay).toBe('0ms');
    expect(cards[2].style.transitionDelay).toBe('160ms');
  });

  it('el kicker decorativo está oculto a lectores de pantalla', () => {
    expect(render().querySelector('.kicker')?.getAttribute('aria-hidden')).toBe('true');
  });
});
