import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import type { Game } from '@/lib/games';
import type { ScoreRow } from '@/lib/scores';
import { SessionService } from '@shared/services/session.service';
import { GamesService } from '@shared/services/games.service';
import HallOfFamePageComponent from './hall-of-fame-page';

const game = (id: string, title: string): Game => ({
  id,
  title,
  short: '',
  long: '',
  cat: 'ARCADE',
  cover: '',
  color: 'green',
  best: 0,
  plays: 0,
});
const GAMES = [game('snake', 'SNAKE'), game('tetris', 'TETRIS'), game('frogger', 'FROGGER')];

const row = (rank: number, name: string, score: number): ScoreRow => ({
  rank,
  name,
  score,
  date: '05/01/2026',
});
const FULL = [row(1, 'ANA', 12345), row(2, 'BOB', 800), row(3, 'CAL', 50), row(4, 'DAN', 10)];

describe('HallOfFamePageComponent', () => {
  interface Fakes {
    getGames?: () => Observable<Game[]>;
    getTopScores?: (id: string, limit: number) => Observable<ScoreRow[]>;
  }

  let fixture: ComponentFixture<HallOfFamePageComponent>;
  let el: HTMLElement;
  const getTopScores = vi.fn();
  const user = signal<{ name: string } | null>(null);

  async function render(fakes: Fakes = {}, juego?: string, settle = true): Promise<void> {
    getTopScores.mockImplementation(fakes.getTopScores ?? (() => of(FULL)));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: { user } },
        {
          provide: GamesService,
          useValue: { getGames: fakes.getGames ?? (() => of(GAMES)), getTopScores },
        },
      ],
    });
    fixture = TestBed.createComponent(HallOfFamePageComponent);
    if (juego !== undefined) fixture.componentRef.setInput('juego', juego);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    if (settle) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  }

  beforeEach(() => {
    getTopScores.mockReset();
    user.set(null);
  });

  const tabs = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const selected = () => tabs().find((t) => t.getAttribute('aria-selected') === 'true');
  const key = (tab: HTMLElement, k: string) => {
    tab.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  it('muestra CARGANDO… mientras llegan los datos', async () => {
    await render({ getGames: () => new Subject<Game[]>() }, undefined, false);
    expect(el.textContent).toContain('CARGANDO…');
  });

  it('pide el ranking top 12 de cada juego', async () => {
    await render();
    expect(getTopScores).toHaveBeenCalledTimes(3);
    expect(getTopScores).toHaveBeenCalledWith('tetris', 12);
  });

  describe('pestaña inicial', () => {
    it('sin ?juego → la primera', async () => {
      await render();
      expect(selected()?.textContent?.trim()).toBe('SNAKE');
    });

    it('?juego=frogger → Frogger', async () => {
      await render({}, 'frogger');
      expect(selected()?.textContent?.trim()).toBe('FROGGER');
    });

    it('?juego desconocido → la primera', async () => {
      await render({}, 'xx');
      expect(selected()?.textContent?.trim()).toBe('SNAKE');
    });

    it('cambiar ?juego con la página abierta cambia la pestaña', async () => {
      await render({}, 'tetris');
      fixture.componentRef.setInput('juego', 'frogger');
      fixture.detectChanges();
      expect(selected()?.textContent?.trim()).toBe('FROGGER');
    });
  });

  describe('ARIA tabs', () => {
    it('tablist con una tab por juego, tabpanel enlazado a la pestaña activa', async () => {
      await render({}, 'tetris');
      expect(el.querySelector('[role="tablist"]')).toBeTruthy();
      expect(tabs().length).toBe(3);
      const panel = el.querySelector('[role="tabpanel"]') as HTMLElement;
      expect(panel.getAttribute('aria-labelledby')).toBe('tab-tetris');
      expect(tabs()[1].getAttribute('aria-controls')).toBe(panel.id);
    });

    it('tabindex itinerante: solo la activa es tabulable', async () => {
      await render();
      expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    });

    it('clic cambia de pestaña y actualiza la clase active', async () => {
      await render();
      tabs()[1].click();
      fixture.detectChanges();
      expect(selected()?.textContent?.trim()).toBe('TETRIS');
      expect(tabs()[1].classList.contains('active')).toBe(true);
      expect(tabs()[0].classList.contains('active')).toBe(false);
    });

    it('ArrowRight/ArrowLeft cambian de pestaña con vuelta circular y mueven el foco', async () => {
      await render();
      key(tabs()[0], 'ArrowRight');
      expect(selected()?.textContent?.trim()).toBe('TETRIS');
      expect(document.activeElement).toBe(tabs()[1]);
      key(tabs()[1], 'ArrowLeft');
      key(tabs()[0], 'ArrowLeft');
      expect(selected()?.textContent?.trim()).toBe('FROGGER');
      key(tabs()[2], 'ArrowRight');
      expect(selected()?.textContent?.trim()).toBe('SNAKE');
    });

    it('Home y End saltan a la primera y a la última', async () => {
      await render({}, 'tetris');
      key(tabs()[1], 'End');
      expect(selected()?.textContent?.trim()).toBe('FROGGER');
      key(tabs()[2], 'Home');
      expect(selected()?.textContent?.trim()).toBe('SNAKE');
    });

    it('otras teclas no hacen nada ni se cancelan', async () => {
      await render();
      const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true, bubbles: true });
      tabs()[0].dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(selected()?.textContent?.trim()).toBe('SNAKE');
    });
  });

  describe('podio y tabla', () => {
    it('podio ordenado plata-oro-bronce y tabla con filas top1-3 marcadas', async () => {
      await render();
      const slots = Array.from(el.querySelectorAll('app-podium-slot'));
      expect(slots.map((s) => s.querySelector('.rank-num')?.textContent)).toEqual([
        '02',
        '01',
        '03',
      ]);
      expect(slots[1].querySelector('.name')?.textContent).toBe('ANA');
      const rows = Array.from(el.querySelectorAll('.hall-table .tr'));
      expect(rows.map((r) => Array.from(r.classList).sort().join(' '))).toEqual([
        'top1 tr',
        'top2 tr',
        'top3 tr',
        'tr',
      ]);
      expect(rows[0].querySelector('.sc')?.textContent).toBe('12.345');
      expect(rows[0].querySelector('.rk')?.textContent).toBe('#01');
    });

    it('escalona la entrada de filas 50 ms', async () => {
      await render();
      const rows = el.querySelectorAll<HTMLElement>('.hall-table .tr');
      expect(rows[0].style.animationDelay).toBe('0ms');
      expect(rows[2].style.animationDelay).toBe('100ms');
    });

    it('podio incompleto: los puestos sin jugador muestran marcadores', async () => {
      await render({ getTopScores: () => of([row(1, 'ANA', 10)]) });
      const slots = Array.from(el.querySelectorAll('app-podium-slot'));
      expect(slots.length).toBe(3);
      expect(slots[0].querySelector('.name')?.textContent).toBe('---');
      expect(slots[0].querySelector('.score')?.textContent).toBe('------');
      expect(slots[1].querySelector('.name')?.textContent).toBe('ANA');
      expect(slots[2].querySelector('.name')?.textContent).toBe('---');
    });

    it('cambiar de pestaña pinta el ranking de ese juego', async () => {
      await render({
        getTopScores: (id) => of(id === 'tetris' ? [row(1, 'ZED', 7)] : FULL),
      });
      tabs()[1].click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.hall-table .tr').length).toBe(1);
      expect(el.querySelector('.hall-table .pl')?.textContent).toBe('ZED');
    });
  });

  describe('vacío y error por pestaña', () => {
    it('sin puntuaciones → ScoreEmpty con enlace a jugar y sin podio', async () => {
      await render({ getTopScores: () => of([]) }, 'tetris');
      expect(el.querySelector('.podium')).toBeNull();
      expect(el.querySelector('.hall-table app-score-empty')).toBeTruthy();
      expect(el.querySelector('a.se-cta')?.getAttribute('href')).toBe('/juegos/tetris/jugar');
    });

    it('un ranking fallido solo afecta a su pestaña', async () => {
      await render({
        getTopScores: (id) => (id === 'tetris' ? throwError(() => new Error('x')) : of(FULL)),
      });
      expect(el.querySelector('.hall-table app-data-error')).toBeNull();
      tabs()[1].click();
      fixture.detectChanges();
      expect(el.querySelector('.hall-table app-data-error')?.textContent).toContain(
        'NO SE PUDO CARGAR EL RANKING',
      );
      expect(el.querySelector('.podium')).toBeNull();
      tabs()[2].click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.hall-table .tr').length).toBe(4);
    });
  });

  describe('errores globales', () => {
    it('fallo al leer los juegos → DataError', async () => {
      await render({ getGames: () => throwError(() => new Error('x')) });
      expect(el.querySelector('app-data-error')).toBeTruthy();
      expect(el.querySelector('[role="tablist"]')).toBeNull();
    });

    it('catálogo vacío → DataError y sin pedir rankings', async () => {
      await render({ getGames: () => of([]) });
      expect(el.querySelector('app-data-error')).toBeTruthy();
      expect(getTopScores).not.toHaveBeenCalled();
    });
  });

  it('muestra el título, el h1 y el enlace de vuelta a la biblioteca', async () => {
    await render();
    expect(el.querySelector('h1')?.textContent).toBe('SALÓN DE LA FAMA');
    expect(el.querySelector('a.btn.lg')?.getAttribute('href')).toBe('/juegos');
  });

  describe('tu mejor marca', () => {
    const mine = () => el.querySelector('.tr.you');

    it('con sesión y fila en el top muestra la marca (nombre en mayúsculas, máx. 10)', async () => {
      user.set({ name: 'Bob' });
      await render();
      expect(el.querySelector('.you-label')?.textContent).toContain('TU MEJOR MARCA EN SNAKE');
      expect(mine()?.querySelector('.pl')?.textContent).toBe('BOB');
      expect(mine()?.querySelector('.rk')?.textContent).toBe('#02');
    });

    it('con sesión pero sin fila en el top no la muestra', async () => {
      user.set({ name: 'ZED' });
      await render();
      expect(mine()).toBeNull();
      expect(el.querySelector('.you-label')).toBeNull();
    });

    it('invitado: sin marca', async () => {
      await render();
      expect(mine()).toBeNull();
    });
  });
});
