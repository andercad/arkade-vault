import { TestBed } from '@angular/core/testing';
import { HOME_STATS } from '@/lib/home';
import { StatsSectionComponent } from './stats-section';

describe('StatsSectionComponent', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(StatsSectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('es una sección reveal con un bloque por estadística', () => {
    const el = render();
    expect(el.querySelector('section.home-stats.reveal')).toBeTruthy();
    const blocks = el.querySelectorAll('.stat-block');
    expect(blocks.length).toBe(HOME_STATS.length);
    HOME_STATS.forEach((st, i) => {
      expect(blocks[i].querySelector('.stat-n')?.textContent).toBe(st.n);
      expect(blocks[i].querySelector('.stat-u')?.textContent).toBe(st.u);
      expect(blocks[i].querySelector('.stat-s')?.textContent).toBe(st.s);
    });
  });

  it('escalona la transición 90 ms por bloque', () => {
    const blocks = render().querySelectorAll<HTMLElement>('.stat-block');
    expect(blocks[0].style.transitionDelay).toBe('0ms');
    expect(blocks[2].style.transitionDelay).toBe('180ms');
  });
});
