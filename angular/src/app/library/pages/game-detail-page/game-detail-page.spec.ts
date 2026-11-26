import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import type { Game } from '@/lib/games';
import type { ScoreRow } from '@/lib/scores';
import { GamesService } from '@shared/services/games.service';
import GameDetailPageComponent from './game-detail-page';

const GAME: Game = {
  id: 'snake',
  title: 'SNAKE',
  short: 's',
  long: 'Descripción larga.',
  cat: 'ARCADE',
  cover: 'cover-snake',
  color: 'green',
  best: 12345,
  plays: 1500,
};
const ROWS: ScoreRow[] = [{ rank: 1, name: 'ANA', score: 100, date: '01/01/2026' }];

describe('GameDetailPageComponent', () => {
  interface Fakes {
    getGame?: () => unknown;
    getTopScores?: () => unknown;
    responseInit?: ResponseInit | null;
  }

  async function render(id: string, fakes: Fakes, settle = true) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: GamesService,
          useValue: {
            getGame: fakes.getGame ?? (() => of(GAME)),
            getTopScores: fakes.getTopScores ?? (() => of(ROWS)),
          },
        },
        { provide: RESPONSE_INIT, useValue: fakes.responseInit ?? null },
      ],
    });
    const fixture = TestBed.createComponent(GameDetailPageComponent);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    if (settle) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra CARGANDO… mientras llega el juego', async () => {
    const el = await render('snake', { getGame: () => new Subject() }, false);
    expect(el.textContent).toContain('CARGANDO…');
  });

  it('pinta la ficha: etiquetas, título, descripción y estadísticas', async () => {
    const el = await render('snake', {});
    expect(el.querySelector('.detail-tags span')?.textContent).toBe('ARCADE');
    expect(el.querySelector('.detail-tags span')?.className).toBe('accent-green');
    expect(el.querySelector('h2')?.textContent).toBe('SNAKE');
    expect(el.querySelector('p')?.textContent).toBe('Descripción larga.');
    const values = Array.from(el.querySelectorAll('.stat-strip .v')).map((v) => v.textContent);
    expect(values[0]).toBe('1,5K');
    expect(values[1]).toBe('12.345');
  });

  it('la dificultad se anuncia como imagen con nombre accesible y sus estrellas son decorativas', async () => {
    const el = await render('snake', {});
    const difficulty = el.querySelector('.stat-difficulty') as HTMLElement;
    expect(difficulty.getAttribute('role')).toBe('img');
    expect(difficulty.getAttribute('aria-label')).toBe('Dificultad: 3 de 5 estrellas');
    expect(difficulty.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('JUGAR AHORA y VOLVER AL VAULT enlazan bien, con el acento del juego', async () => {
    const el = await render('snake', {});
    const play = el.querySelector('a.pulse') as HTMLAnchorElement;
    expect(play.getAttribute('href')).toBe('/juegos/snake/jugar');
    expect(Array.from(play.classList).sort()).toEqual(['btn', 'green', 'pulse', 'xl']);
    expect(el.querySelector('a.ghost')?.getAttribute('href')).toBe('/juegos');
  });

  it('pinta el ranking del juego con el límite 10', async () => {
    const getTopScores = vi.fn().mockReturnValue(of(ROWS));
    const el = await render('snake', { getTopScores });
    expect(getTopScores).toHaveBeenCalledWith('snake', 10);
    expect(el.querySelector('.lb-row .pl')?.textContent).toContain('ANA');
  });

  it('ranking vacío → ScoreEmpty con enlace a jugar', async () => {
    const el = await render('snake', { getTopScores: () => of([]) });
    expect(el.querySelector('.score-empty')).toBeTruthy();
    expect(el.querySelector('a.se-cta')?.getAttribute('href')).toBe('/juegos/snake/jugar');
  });

  it('un fallo del ranking no tumba la ficha: el leaderboard pinta su error', async () => {
    const el = await render('snake', { getTopScores: () => throwError(() => new Error('x')) });
    expect(el.querySelector('h2')?.textContent).toBe('SNAKE');
    expect(el.querySelector('app-leaderboard app-data-error')).toBeTruthy();
  });

  it('un fallo de lectura del juego → DataError, sin pedir el ranking', async () => {
    const getTopScores = vi.fn();
    const el = await render('snake', {
      getGame: () => throwError(() => new Error('x')),
      getTopScores,
    });
    expect(el.querySelector('app-data-error')).toBeTruthy();
    expect(el.querySelector('.av-detail')).toBeNull();
    expect(getTopScores).not.toHaveBeenCalled();
  });

  it('id inexistente → «no encontrado» y estado 404 en la respuesta', async () => {
    const responseInit: ResponseInit = {};
    const el = await render('xxx', { getGame: () => of(null), responseInit });
    expect(el.querySelector('app-not-found')).toBeTruthy();
    expect(el.querySelector('.av-detail')).toBeNull();
    expect(responseInit.status).toBe(404);
  });

  it('un juego existente no toca el estado de la respuesta', async () => {
    const responseInit: ResponseInit = {};
    await render('snake', { responseInit });
    expect(responseInit.status).toBeUndefined();
  });

  it('un fallo de lectura no marca 404', async () => {
    const responseInit: ResponseInit = {};
    await render('snake', { getGame: () => throwError(() => new Error('x')), responseInit });
    expect(responseInit.status).toBeUndefined();
  });
});
