import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { Game } from '@/lib/games';
import { GamesService } from '@shared/services/games.service';
import { GamesSectionComponent } from './games-section';

const game = (n: number): Game => ({
  id: `g${n}`,
  title: `JUEGO ${n}`,
  short: '',
  long: '',
  cat: 'ARCADE',
  cover: `cover-${n}`,
  color: 'green',
  best: 0,
  plays: 0,
});

describe('GamesSectionComponent', () => {
  async function render(getGames: () => unknown): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: GamesService, useValue: { getGames } }],
    });
    const fixture = TestBed.createComponent(GamesSectionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra solo las 6 primeras mini-cards, en orden', async () => {
    const el = await render(() => of([1, 2, 3, 4, 5, 6, 7, 8].map(game)));
    const titles = Array.from(el.querySelectorAll('.mini-title')).map((t) => t.textContent);
    expect(titles).toEqual(['JUEGO 1', 'JUEGO 2', 'JUEGO 3', 'JUEGO 4', 'JUEGO 5', 'JUEGO 6']);
  });

  it('con menos de 6 juegos muestra los que haya', async () => {
    const el = await render(() => of([game(1), game(2)]));
    expect(el.querySelectorAll('app-mini-card').length).toBe(2);
  });

  it('error de lectura → DataError y sin rejilla, pero el enlace a la biblioteca sigue', async () => {
    const el = await render(() => throwError(() => new Error('x')));
    expect(el.querySelector('app-data-error')).toBeTruthy();
    expect(el.querySelector('.mini-rail')).toBeNull();
    expect(el.querySelector('a.btn.lg')?.getAttribute('href')).toBe('/juegos');
  });

  it('encabezado h2, kicker decorativo y sección reveal', async () => {
    const el = await render(() => of([]));
    expect(el.querySelector('section.home-section.reveal')).toBeTruthy();
    expect(el.querySelector('h2')?.textContent).toBe('JUEGOS DISPONIBLES AHORA');
    expect(el.querySelector('.kicker')?.getAttribute('aria-hidden')).toBe('true');
  });
});
