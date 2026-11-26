import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import type { Game } from '@/lib/games';
import { GamesService } from '@shared/services/games.service';
import LibraryPageComponent from './library-page';

const GAME = { id: 'snake', title: 'SNAKE', cat: 'ARCADE', color: 'green', best: 0 } as Game;

describe('LibraryPageComponent', () => {
  async function render(getGames: () => unknown) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: GamesService, useValue: { getGames } }],
    });
    const fixture = TestBed.createComponent(LibraryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra CARGANDO… mientras llegan los datos', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GamesService, useValue: { getGames: () => new Subject() } },
      ],
    });
    const fixture = TestBed.createComponent(LibraryPageComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('CARGANDO…');
  });

  it('pinta la biblioteca con los juegos', async () => {
    const el = await render(() => of([GAME]));
    expect(el.querySelector('app-game-library')).toBeTruthy();
    expect(el.querySelector('.card .title')?.textContent).toBe('SNAKE');
  });

  it('error de lectura → DataError', async () => {
    const el = await render(() => throwError(() => new Error('x')));
    expect(el.querySelector('app-data-error')).toBeTruthy();
    expect(el.querySelector('app-game-library')).toBeNull();
  });
});
