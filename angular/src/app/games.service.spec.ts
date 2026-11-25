import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Game } from '@/lib/games';
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
});
