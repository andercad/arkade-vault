import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import type { RecentScoreView, TopTodayRow } from '@shared/models/scores';
import { ScoresService } from '@shared/services/scores.service';
import { ActivitySectionComponent } from './activity-section';

const RECENT: RecentScoreView[] = [
  { player: 'ANA', gameTitle: 'SNAKE', color: 'green', score: 12345, ago: 'hace 5 min' },
  { player: 'BOB', gameTitle: 'TETRIS', color: 'cyan', score: 800, ago: 'ahora mismo' },
];
const TOP: TopTodayRow[] = [
  { player: 'ANA', score: 5000 },
  { player: 'BOB', score: 400 },
  { player: 'CAL', score: 300 },
  { player: 'DAN', score: 200 },
];

describe('ActivitySectionComponent', () => {
  interface Fakes {
    getRecent?: () => unknown;
    getTopToday?: () => unknown;
  }

  async function render(fakes: Fakes, settle = true): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ScoresService,
          useValue: {
            getRecent: fakes.getRecent ?? (() => of(RECENT)),
            getTopToday: fakes.getTopToday ?? (() => of(TOP)),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ActivitySectionComponent);
    fixture.detectChanges();
    if (settle) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
    return fixture.nativeElement as HTMLElement;
  }

  const cards = (el: HTMLElement) => el.querySelectorAll('.activity-card');

  it('sección reveal con h2 y una h3 por tarjeta', async () => {
    const el = await render({});
    expect(el.querySelector('section.home-section.reveal')).toBeTruthy();
    expect(el.querySelector('h2')?.textContent).toBe('ACTIVIDAD EN VIVO');
    const titles = Array.from(el.querySelectorAll('h3')).map((h) => h.textContent);
    expect(titles).toEqual(['▸ ÚLTIMAS PUNTUACIONES', '▸ TOP JUGADORES · HOY']);
  });

  describe('últimas puntuaciones', () => {
    it('pinta jugador, juego con color, puntos formateados y «ago» del servidor', async () => {
      const rows = (await render({})).querySelectorAll('.tick-row');
      expect(rows.length).toBe(2);
      expect(rows[0].querySelector('.tk-p')?.textContent).toBe('ANA');
      expect(rows[0].querySelector('.tk-mid')?.textContent).toBe('▸ SNAKE');
      expect(rows[0].querySelector('.tk-mid')?.classList.contains('neon-green')).toBe(true);
      expect(rows[0].querySelector('.tk-s')?.textContent).toBe('+12.345');
      expect(rows[0].querySelector('.tk-t')?.textContent).toBe('hace 5 min');
    });

    it('escalona la animación 60 ms por fila', async () => {
      const rows = (await render({})).querySelectorAll<HTMLElement>('.tick-row');
      expect(rows[0].style.animationDelay).toBe('0ms');
      expect(rows[1].style.animationDelay).toBe('60ms');
    });

    it('sin puntuaciones → ScoreEmpty con enlace a la biblioteca', async () => {
      const el = await render({ getRecent: () => of([]) });
      const empty = cards(el)[0].querySelector('app-score-empty');
      expect(empty).toBeTruthy();
      expect(empty?.querySelector('a.se-cta')?.getAttribute('href')).toBe('/juegos');
    });

    it('error → DataError solo en su tarjeta; la otra sigue', async () => {
      const el = await render({ getRecent: () => throwError(() => new Error('x')) });
      expect(cards(el)[0].querySelector('app-data-error')).toBeTruthy();
      expect(cards(el)[0].querySelector('.tick-row')).toBeNull();
      expect(cards(el)[1].querySelectorAll('.top-row').length).toBe(4);
      expect(cards(el)[1].querySelector('app-data-error')).toBeNull();
    });

    it('mientras carga la tarjeta está vacía', async () => {
      const el = await render({ getRecent: () => new Subject() }, false);
      expect(cards(el)[0].querySelector('.ticker, app-score-empty, app-data-error')).toBeNull();
    });
  });

  describe('top de hoy', () => {
    it('pinta rank, jugador y puntos; top1-3 marcados y no más', async () => {
      const rows = Array.from((await render({})).querySelectorAll('.top-row'));
      expect(rows.map((r) => r.className)).toEqual([
        'top-row top1',
        'top-row top2',
        'top-row top3',
        'top-row',
      ]);
      expect(rows[0].querySelector('.tp-rk')?.textContent).toBe('#01');
      expect(rows[0].querySelector('.tp-p')?.textContent).toBe('ANA');
      expect(rows[0].querySelector('.tp-s')?.textContent).toBe('5000');
    });

    it('la barra baja 16 puntos por fila desde el 100 %', async () => {
      const fills = (await render({})).querySelectorAll<HTMLElement>('.tp-fill');
      expect(Array.from(fills).map((f) => f.style.width)).toEqual(['100%', '84%', '68%', '52%']);
    });

    it('enlaza al salón de la fama', async () => {
      const el = await render({});
      expect(el.querySelector('a.lb-link')?.getAttribute('href')).toBe('/salon-de-la-fama');
    });

    it('sin datos → ScoreEmpty; error → DataError solo en su tarjeta', async () => {
      const empty = await render({ getTopToday: () => of([]) });
      expect(cards(empty)[1].querySelector('app-score-empty')).toBeTruthy();
      TestBed.resetTestingModule();
      const failed = await render({ getTopToday: () => throwError(() => new Error('x')) });
      expect(cards(failed)[1].querySelector('app-data-error')).toBeTruthy();
      expect(cards(failed)[0].querySelectorAll('.tick-row').length).toBe(2);
    });
  });
});
