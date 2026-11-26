import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import type { GameSnapshot } from '@/lib/game-engine';
import type { GameDefinition } from '@/lib/game-registry';
import type { Game } from '@/lib/games';
import type { SessionUser } from '@shared/models/session';
import { ScoresService } from '@shared/services/scores.service';
import { SessionService } from '@shared/services/session.service';
import { GameCanvasComponent } from '../game-canvas/game-canvas';
import { GamePlayerComponent } from './game-player';

const calls: string[] = [];
const submitScore = vi.fn<(id: string, score: number) => Observable<void>>();
const session = { user: signal<SessionUser | null>(null), loading: signal(false) };
const USER: SessionUser = { id: 'u1', name: 'ANDER', avatarUrl: null, hasPassword: true };

/** Canvas falso: jsdom no tiene canvas 2D, y aquí solo importa la API del reproductor. */
@Component({ selector: 'app-game-canvas', template: '' })
class GameCanvasStub {
  readonly definition = input.required<GameDefinition>();
  readonly stateChange = output<GameSnapshot>();
  readonly gameOver = output<number>();
  pause() {
    calls.push('pause');
  }
  resume() {
    calls.push('resume');
  }
  restart() {
    calls.push('restart');
  }
  end() {
    calls.push('end');
  }
  setOption(key: string, value: string) {
    calls.push(`setOption:${key}=${value}`);
  }
}

const game = (id: string): Game => ({ id, title: id.toUpperCase() }) as Game;

describe('GamePlayerComponent', () => {
  beforeEach(() => {
    calls.length = 0;
    submitScore.mockReset().mockReturnValue(of(undefined));
    session.user.set(null);
    session.loading.set(false);
    TestBed.overrideComponent(GamePlayerComponent, {
      remove: { imports: [GameCanvasComponent] },
      add: { imports: [GameCanvasStub] },
    });
    TestBed.configureTestingModule({ providers: [
        provideRouter([]),
        { provide: SessionService, useValue: session },
        { provide: ScoresService, useValue: { submitScore } },
      ],
    });
  });

  function setup(id = 'tetris') {
    const fixture = TestBed.createComponent(GamePlayerComponent);
    fixture.componentRef.setInput('game', game(id));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const canvas = fixture.debugElement.query((d) => d.name === 'app-game-canvas')
      .componentInstance as GameCanvasStub;
    const emit = (s: Partial<GameSnapshot>) => {
      canvas.stateChange.emit({ score: 0, status: 'playing', hud: [], ...s });
      fixture.detectChanges();
    };
    const finish = (score: number) => {
      canvas.gameOver.emit(score);
      fixture.detectChanges();
    };
    const click = (text: string) => {
      const btn = [...el.querySelectorAll<HTMLElement>('button, a')].find((b) =>
        b.textContent?.trim().includes(text),
      )!;
      btn.click();
      fixture.detectChanges();
      return btn;
    };
    return { fixture, el, emit, finish, click };
  }

  it('HUD: jugador INVITADO, puntuación y campos del adaptador', () => {
    const { el, emit } = setup();
    expect(el.querySelector('.hud-stat .v')?.textContent).toBe('INVITADO');
    emit({
      score: 12345,
      hud: [{ key: 'lines', label: 'Líneas', value: '07' }],
    });
    const stats = [...el.querySelectorAll('.hud-stat')];
    expect(stats[1].querySelector('.v')?.textContent).toBe((12345).toLocaleString('es-ES'));
    expect(stats[2].classList.contains('lines')).toBe(true);
    expect(stats[2].querySelector('.l')?.textContent).toBe('Líneas');
    expect(stats[2].querySelector('.v')?.textContent).toBe('07');
  });

  it('marco CRT; los juegos verticales usan crt-portrait', () => {
    expect(setup('tetris').el.querySelector('.crt')!.classList.contains('crt-portrait')).toBe(true);
    expect(setup('asteroids').el.querySelector('.crt')!.classList.contains('crt-portrait')).toBe(false);
  });

  it('pausa: el botón alterna pause/resume y el rótulo; overlay solo en pausa', () => {
    const { el, emit, click } = setup();
    expect(el.querySelector('.pause-overlay')).toBeNull();
    click('PAUSA');
    expect(calls).toEqual(['pause']);
    emit({ status: 'paused' });
    expect(el.querySelector('.pause-overlay')?.textContent).toContain('EN PAUSA');
    expect(el.textContent).toContain('REANUDAR');
    click('REANUDAR');
    expect(calls).toEqual(['pause', 'resume']);
    emit({ status: 'playing' });
    expect(el.querySelector('.pause-overlay')).toBeNull();
  });

  it('opciones live en la barra (skin); cambiarla llama a setOption', () => {
    const { el, fixture } = setup('tetris');
    const select = el.querySelector<HTMLSelectElement>('.player-hud select')!;
    expect(select).toBeTruthy();
    const other = [...select.options].find((o) => o.value !== select.value)!;
    select.value = other.value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(calls).toContain(`setOption:skin=${other.value}`);
  });

  it('opciones restart solo en el overlay de pausa, con REINICIAR', () => {
    const { el, emit, click } = setup('tetris');
    expect(el.querySelector('.pause-options')).toBeNull();
    emit({ status: 'paused' });
    const options = el.querySelector('.pause-options')!;
    expect(options.querySelector('select')).toBeTruthy();
    click('REINICIAR');
    expect(calls).toContain('restart');
  });

  it('FIN llama a end() del motor', () => {
    const { click } = setup();
    click('FIN');
    expect(calls).toEqual(['end']);
  });

  it('SALIR enlaza al detalle del juego', () => {
    const { el } = setup('snake');
    const salir = [...el.querySelectorAll('a')].find((a) => a.textContent?.includes('SALIR'))!;
    expect(salir.getAttribute('href')).toBe('/juegos/snake');
  });

  it('fin de partida: modal de invitado con enlaces y puntuación final', () => {
    const { el, emit, finish } = setup('snake');
    expect(el.querySelector('.modal-bd')).toBeNull();
    emit({ score: 900 });
    finish(900);
    const modal = el.querySelector('.modal')!;
    expect(modal.querySelector('.final')?.textContent).toBe('900');
    expect(modal.textContent).toContain('INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN');
    expect(modal.textContent).not.toContain('GUARDAR PUNTUACIÓN_');
    const hrefs = [...modal.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/login', '/salon-de-la-fama?juego=snake', '/juegos']);
  });

  it('JUGAR DE NUEVO reinicia el motor y cierra el modal', () => {
    const { el, finish, click } = setup();
    finish(10);
    click('JUGAR DE NUEVO');
    expect(calls).toContain('restart');
    expect(el.querySelector('.modal-bd')).toBeNull();
  });

  it('mando táctil con los controles del registro, desactivado en pausa y al terminar', () => {
    const { el, emit, finish } = setup();
    const pad = () => el.querySelector<HTMLButtonElement>('.gp button.dp-left')!;
    expect(pad().disabled).toBe(false);
    emit({ status: 'paused' });
    expect(pad().disabled).toBe(true);
    emit({ status: 'playing' });
    expect(pad().disabled).toBe(false);
    finish(1);
    expect(pad().disabled).toBe(true);
  });

  it('al cambiar de juego el estado queda limpio (snapshot, fin y opciones)', () => {
    const { fixture, el, emit, finish } = setup('tetris');
    emit({ score: 500, status: 'paused' });
    finish(500);
    fixture.componentRef.setInput('game', game('snake'));
    fixture.detectChanges();
    expect(el.querySelector('.modal-bd')).toBeNull();
    expect(el.querySelector('.pause-overlay')).toBeNull();
    expect(el.querySelectorAll('.hud-stat .v')[1].textContent).toBe('0');
  });

  describe('sesión y guardado', () => {
    it('HUD: nombre del usuario, — mientras carga e INVITADO sin sesión', () => {
      session.user.set(USER);
      expect(setup().el.querySelector('.hud-stat .v')?.textContent).toBe('ANDER');
      session.loading.set(true);
      expect(setup().el.querySelector('.hud-stat .v')?.textContent).toBe('—');
    });

    it('con sesión guarda una vez al terminar y muestra GUARDADA', () => {
      session.user.set(USER);
      const { el, emit, finish } = setup('snake');
      emit({ score: 900 });
      finish(900);
      expect(submitScore).toHaveBeenCalledTimes(1);
      expect(submitScore).toHaveBeenCalledWith('snake', 900);
      const modal = el.querySelector('.modal')!;
      expect(modal.textContent).toContain('PUNTUACIÓN GUARDADA');
      expect(modal.textContent).not.toContain('INICIA SESIÓN');
      expect(modal.querySelector('[role="status"]')).toBeTruthy();
    });

    it('mientras guarda muestra GUARDANDO…', () => {
      session.user.set(USER);
      const pending = new Subject<void>();
      submitScore.mockReturnValue(pending);
      const { el, fixture, finish } = setup();
      finish(5);
      expect(el.querySelector('.modal')!.textContent).toContain('GUARDANDO');
      pending.next();
      pending.complete();
      fixture.detectChanges();
      expect(el.querySelector('.modal')!.textContent).toContain('PUNTUACIÓN GUARDADA');
    });

    it('error: avisa con role=alert y el reintento vuelve a guardar la misma puntuación', () => {
      session.user.set(USER);
      submitScore.mockReturnValueOnce(throwError(() => new Error('x')));
      const { el, finish, click } = setup('snake');
      finish(42);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('NO SE PUDO GUARDAR');
      click('GUARDAR PUNTUACIÓN');
      expect(submitScore).toHaveBeenCalledTimes(2);
      expect(submitScore).toHaveBeenLastCalledWith('snake', 42);
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(el.querySelector('.modal')!.textContent).toContain('PUNTUACIÓN GUARDADA');
    });

    it('el invitado no llama al servidor y ve el aviso', () => {
      const { el, finish } = setup();
      finish(10);
      expect(submitScore).not.toHaveBeenCalled();
      expect(el.querySelector('.modal')!.textContent).toContain(
        'INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN',
      );
    });

    it('JUGAR DE NUEVO y terminar otra vez guarda la nueva partida', () => {
      session.user.set(USER);
      const { finish, click } = setup('snake');
      finish(10);
      click('JUGAR DE NUEVO');
      finish(20);
      expect(submitScore).toHaveBeenCalledTimes(2);
      expect(submitScore).toHaveBeenLastCalledWith('snake', 20);
    });
  });
});
