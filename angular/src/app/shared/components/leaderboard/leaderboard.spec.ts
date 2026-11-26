import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ScoreRow } from '@/lib/scores';
import { LeaderboardComponent } from './leaderboard';

describe('LeaderboardComponent', () => {
  function create(rows: ScoreRow[] | null, playHref?: string): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LeaderboardComponent);
    fixture.componentRef.setInput('rows', rows);
    if (playHref) fixture.componentRef.setInput('playHref', playHref);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const row = (rank: number, score: number): ScoreRow => ({
    rank,
    name: `P${rank}`,
    score,
    date: '01/01/2026',
  });

  it('pinta una fila por puntuación con rank, nombre, fecha y score formateado', () => {
    const el = create([row(1, 12345), row(2, 50)]);
    const rows = el.querySelectorAll('.lb-row');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.rk')?.textContent).toBe('#01');
    expect(rows[0].querySelector('.pl')?.textContent).toContain('P1');
    expect(rows[0].querySelector('.pl')?.textContent).toContain('01/01/2026');
    expect(rows[0].querySelector('.sc')?.textContent).toBe('12.345');
  });

  it('marca top1, top2 y top3 y no más', () => {
    const el = create([1, 2, 3, 4].map((n) => row(n, 10 - n)));
    const rows = Array.from(el.querySelectorAll('.lb-row'));
    expect(rows.map((r) => r.className)).toEqual([
      'lb-row top1',
      'lb-row top2',
      'lb-row top3',
      'lb-row',
    ]);
  });

  it('vacío → ScoreEmpty con el enlace de jugar', () => {
    const el = create([], '/juegos/snake/jugar');
    expect(el.querySelector('.score-empty')).toBeTruthy();
    expect(el.querySelector('.lb-row')).toBeNull();
    expect(el.querySelector('a.se-cta')?.getAttribute('href')).toBe('/juegos/snake/jugar');
  });

  it('null → error de lectura', () => {
    const el = create(null);
    expect(el.querySelector('app-data-error')?.textContent).toContain(
      'NO SE PUDO CARGAR EL RANKING',
    );
    expect(el.querySelector('.lb-row')).toBeNull();
  });

  it('siempre muestra el título', () => {
    expect(create(null).querySelector('h3')?.textContent).toBe('MEJORES PUNTUACIONES');
  });
});
