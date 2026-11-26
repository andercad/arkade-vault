import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ScoreEmptyComponent } from './score-empty';

describe('ScoreEmptyComponent', () => {
  function create(playHref?: string): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ScoreEmptyComponent);
    if (playHref) fixture.componentRef.setInput('playHref', playHref);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra título, pista y 3 filas fantasma ocultas a lectores', () => {
    const el = create();
    expect(el.classList.contains('score-empty')).toBe(true);
    expect(el.querySelector('.se-title')?.textContent).toBe('AÚN SIN PUNTUACIONES');
    const rows = el.querySelectorAll('.ghost-row');
    expect(rows.length).toBe(3);
    rows.forEach((r) => expect(r.getAttribute('aria-hidden')).toBe('true'));
    expect(rows[0].textContent).toContain('#01');
    expect(rows[2].textContent).toContain('#03');
  });

  it('sin playHref no hay botón', () => {
    expect(create().querySelector('.se-cta')).toBeNull();
  });

  it('con playHref enlaza a la ruta', () => {
    const cta = create('/juegos/snake/jugar').querySelector('a.se-cta');
    expect(cta?.getAttribute('href')).toBe('/juegos/snake/jugar');
  });
});
