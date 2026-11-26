import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import type { Game } from '@/lib/games';
import { GamesService } from '@shared/services/games.service';
import { GamePlayerComponent } from '@shared/components/game-player/game-player';
import PlayPageComponent from './play-page';

@Component({ selector: 'app-game-player', template: '' })
class GamePlayerStub {
  readonly game = input.required<Game>();
}

describe('PlayPageComponent', () => {
  let getGame: (id: string) => Observable<Game | null>;
  let calls: string[];

  beforeEach(() => {
    calls = [];
    getGame = () => of(null);
    // El reproductor tiene su propio spec: aquí se sustituye por un stub.
    TestBed.overrideComponent(PlayPageComponent, {
      remove: { imports: [GamePlayerComponent] },
      add: { imports: [GamePlayerStub] },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: GamesService,
          useValue: {
            getGame: (id: string) => {
              calls.push(id);
              return getGame(id);
            },
          },
        },
      ],
    });
  });

  async function render(id: string) {
    const fixture = TestBed.createComponent(PlayPageComponent);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('id fuera del registro → no encontrado, sin llamar al servicio', async () => {
    const el = await render('xxx');
    expect(el.querySelector('app-not-found')).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('muestra CARGANDO… mientras llega el juego', async () => {
    getGame = () => new Subject<Game | null>();
    const fixture = TestBed.createComponent(PlayPageComponent);
    fixture.componentRef.setInput('id', 'snake');
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('CARGANDO');
  });

  it('juego cargado → pinta el reproductor', async () => {
    getGame = () => of({ id: 'tetris', title: 'TETRIS' } as Game);
    const el = await render('tetris');
    expect(el.querySelector('app-game-player')).toBeTruthy();
  });

  it('404 del endpoint (null) → no encontrado', async () => {
    getGame = () => of(null);
    expect((await render('snake')).querySelector('app-not-found')).toBeTruthy();
  });

  it('error de lectura → DataError', async () => {
    getGame = () => throwError(() => new Error('boom'));
    const el = await render('snake');
    expect(el.querySelector('app-data-error')).toBeTruthy();
  });
});
