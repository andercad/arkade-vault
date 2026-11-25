import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import type { GameDefinition } from '@/lib/game-registry';
import type { Game } from '@/lib/games';
import { GamesService } from '../games.service';
import { GameCanvasComponent } from '@shared/components/game-canvas/game-canvas';
import { PlayPageComponent } from './play-page';

@Component({ selector: 'app-game-canvas', template: '' })
class GameCanvasStub {
  readonly definition = input.required<GameDefinition>();
}

describe('PlayPageComponent', () => {
  let getGame: (id: string) => Observable<Game | null>;
  let calls: string[];

  beforeEach(() => {
    calls = [];
    getGame = () => of(null);
    // jsdom no tiene canvas 2D: se sustituye el canvas real por un stub.
    TestBed.overrideComponent(PlayPageComponent, {
      remove: { imports: [GameCanvasComponent] },
      add: { imports: [GameCanvasStub] },
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

  it('juego cargado → marco CRT con el canvas y el mando táctil del registro', async () => {
    getGame = () => of({ id: 'tetris', title: 'TETRIS' } as Game);
    const el = await render('tetris');
    expect(el.querySelector('.crt .crt-screen app-game-canvas')).toBeTruthy();
    expect(el.querySelector('app-touch-controls .gp')).toBeTruthy();
  });

  it('juego vertical (alto > ancho) usa crt-portrait', async () => {
    getGame = () => of({ id: 'tetris', title: 'TETRIS' } as Game);
    const el = await render('tetris');
    expect(el.querySelector('.crt')!.classList.contains('crt-portrait')).toBe(true);
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
