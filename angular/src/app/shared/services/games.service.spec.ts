import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Game } from '@/lib/games';
import type { ScoreRow } from '@/lib/scores';
import { GamesService } from './games.service';

describe('GamesService', () => {
  let service: GamesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GamesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide /api/games/:id y devuelve el juego', () => {
    const game = { id: 'snake', title: 'SNAKE' } as Game;
    let result: Game | null | undefined;
    service.getGame('snake').subscribe((g) => (result = g));
    http.expectOne('/api/games/snake').flush(game);
    expect(result).toEqual(game);
  });

  it('codifica el id en la URL', () => {
    service.getGame('a/b').subscribe();
    http.expectOne('/api/games/a%2Fb').flush(null);
  });

  it('404 → null', () => {
    let result: Game | null | undefined;
    service.getGame('xxx').subscribe((g) => (result = g));
    http.expectOne('/api/games/xxx').flush({}, { status: 404, statusText: 'Not Found' });
    expect(result).toBeNull();
  });

  it('500 → propaga el error', () => {
    let failed = false;
    service.getGame('snake').subscribe({ error: () => (failed = true) });
    http.expectOne('/api/games/snake').flush({}, { status: 500, statusText: 'Error' });
    expect(failed).toBe(true);
  });

  it('getGames pide /api/games', () => {
    const games = [{ id: 'snake' }] as Game[];
    let result: Game[] | undefined;
    service.getGames().subscribe((g) => (result = g));
    http.expectOne('/api/games').flush(games);
    expect(result).toEqual(games);
  });

  it('getGames propaga el error', () => {
    let failed = false;
    service.getGames().subscribe({ error: () => (failed = true) });
    http.expectOne('/api/games').flush({}, { status: 500, statusText: 'Error' });
    expect(failed).toBe(true);
  });

  it('getTopScores pide /api/games/:id/scores?limit=N', () => {
    const rows = [{ rank: 1, name: 'ANA', score: 10, date: '01/01/2026' }] as ScoreRow[];
    let result: ScoreRow[] | undefined;
    service.getTopScores('snake', 5).subscribe((r) => (result = r));
    http.expectOne('/api/games/snake/scores?limit=5').flush(rows);
    expect(result).toEqual(rows);
  });

  it('getTopScores codifica el id', () => {
    service.getTopScores('a/b', 10).subscribe();
    http.expectOne('/api/games/a%2Fb/scores?limit=10').flush([]);
  });

  it('getTopScores propaga el error', () => {
    let failed = false;
    service.getTopScores('snake', 10).subscribe({ error: () => (failed = true) });
    http
      .expectOne('/api/games/snake/scores?limit=10')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(failed).toBe(true);
  });
});
