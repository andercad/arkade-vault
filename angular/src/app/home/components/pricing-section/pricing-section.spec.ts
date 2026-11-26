import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FAQ, PRICING_FEATURES } from '@/lib/home';
import { PricingSectionComponent } from './pricing-section';

describe('PricingSectionComponent', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PricingSectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('es una sección reveal con encabezado PRECIOS', () => {
    const el = render();
    expect(el.querySelector('section.home-section.reveal')).toBeTruthy();
    expect(el.querySelector('h2')?.textContent).toBe('PRECIOS');
  });

  it('lista las ventajas del plan sin leer el check decorativo', () => {
    const items = render().querySelectorAll('.pc-list li');
    expect(items.length).toBe(PRICING_FEATURES.length);
    expect(items[0].textContent).toContain(PRICING_FEATURES[0]);
    expect(items[0].querySelector('[aria-hidden="true"]')?.textContent).toBe('✔');
  });

  it('el botón EMPEZAR GRATIS lleva a /login', () => {
    const cta = render().querySelector('a.pc-cta');
    expect(cta?.getAttribute('href')).toBe('/login');
    expect(cta?.textContent).toContain('EMPEZAR GRATIS');
  });

  it('pinta una pregunta frecuente por entrada de FAQ', () => {
    const items = render().querySelectorAll('.faq-item');
    expect(items.length).toBe(FAQ.length);
    expect(items[1].querySelector('.faq-q')?.textContent).toBe(FAQ[1].q);
    expect(items[1].querySelector('.faq-a')?.textContent).toBe(FAQ[1].a);
  });

  it('el sello FREE PLAY es decorativo', () => {
    expect(render().querySelector('.pc-stamp')?.getAttribute('aria-hidden')).toBe('true');
  });
});
