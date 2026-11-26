import { TestBed } from '@angular/core/testing';
import AboutPageComponent from './about-page';

describe('AboutPageComponent', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(AboutPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('monta el hero, el bloque de contacto y el formulario', () => {
    const el = render();
    expect(el.querySelector('app-about-hero h1')?.textContent).toBe('ACERCA DE ARCADE VAULT');
    expect(el.querySelector('section.about-contact.reveal')).toBeTruthy();
    expect(el.querySelector('h2.contact-title')?.textContent).toBe('CONTÁCTANOS');
    expect(el.querySelector('app-contact-form form')).toBeTruthy();
  });

  it('las tres notas de contacto llevan LED decorativo', () => {
    const leds = render().querySelectorAll('.tip .tip-led');
    expect(leds.length).toBe(3);
    leds.forEach((l) => expect(l.getAttribute('aria-hidden')).toBe('true'));
  });
});
