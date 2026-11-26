import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RecentScoreView, TopTodayRow } from '@shared/models/scores';
import { ScoresService } from './scores.service';

describe('ScoresService', () => {
  let service: ScoresService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScoresService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getRecent pide /api/scores/recent', () => {
    const rows: RecentScoreView[] = [
      { player: 'ANA', gameTitle: 'SNAKE', color: 'green', score: 10, ago: 'hace 5 min' },
    ];
    let result: RecentScoreView[] | undefined;
    service.getRecent().subscribe((r) => (result = r));
    http.expectOne('/api/scores/recent').flush(rows);
    expect(result).toEqual(rows);
  });

  it('getRecent propaga el error', () => {
    let failed = false;
    service.getRecent().subscribe({ error: () => (failed = true) });
    http.expectOne('/api/scores/recent').flush({}, { status: 500, statusText: 'Error' });
    expect(failed).toBe(true);
  });

  it('getTopToday pide /api/scores/top-today', () => {
    const rows: TopTodayRow[] = [{ player: 'ANA', score: 10 }];
    let result: TopTodayRow[] | undefined;
    service.getTopToday().subscribe((r) => (result = r));
    http.expectOne('/api/scores/top-today').flush(rows);
    expect(result).toEqual(rows);
  });

  it('getTopToday propaga el error', () => {
    let failed = false;
    service.getTopToday().subscribe({ error: () => (failed = true) });
    http.expectOne('/api/scores/top-today').flush({}, { status: 500, statusText: 'Error' });
    expect(failed).toBe(true);
  });

  it('submitScore hace POST /api/scores con gameId y score (sin nombre)', () => {
    let done = false;
    service.submitScore('snake', 120).subscribe(() => (done = true));
    const req = http.expectOne('/api/scores');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ gameId: 'snake', score: 120 });
    req.flush(null, { status: 201, statusText: 'Created' });
    expect(done).toBe(true);
  });

  it('submitScore propaga el error', () => {
    let status = 0;
    service.submitScore('snake', 1).subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/scores').flush({ error: 'x' }, { status: 401, statusText: 'No' });
    expect(status).toBe(401);
  });
});
