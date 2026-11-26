import { TestBed } from '@angular/core/testing';
import { AboutHeroComponent } from './about-hero';

describe('AboutHeroComponent', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(AboutHeroComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('pinta el h1 y la misión', () => {
    const el = render();
    expect(el.querySelector('h1')?.textContent).toBe('ACERCA DE ARCADE VAULT');
    expect(el.querySelector('.about-mission')?.textContent).toContain('nació del amor');
  });

  it('tres puntos destacados con color, icono y retardo escalonado', () => {
    const items = render().querySelectorAll<HTMLElement>('.highlight');
    expect(items.length).toBe(3);
    expect(['magenta', 'cyan', 'green'].map((c, i) => items[i].classList.contains(c))).toEqual([
      true,
      true,
      true,
    ]);
    items.forEach((it) => expect(it.querySelector('svg.hl-icon')).toBeTruthy());
    expect(items[2].style.transitionDelay).toBe('160ms');
  });

  it('el separador es reveal, decorativo y tiene 24 cuadros', () => {
    const divider = render().querySelector('section.about-divider.reveal');
    expect(divider?.getAttribute('aria-hidden')).toBe('true');
    expect(divider?.querySelectorAll('.div-pixels span').length).toBe(24);
  });
});
