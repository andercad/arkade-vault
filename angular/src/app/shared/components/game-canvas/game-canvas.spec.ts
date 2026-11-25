import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import type { GameCallbacks, GameEngine, GameSnapshot } from '@/lib/game-engine';
import type { GameDefinition } from '@/lib/game-registry';
import { GameCanvasComponent } from './game-canvas';

interface FakeEngine extends GameEngine {
  start: Mock<() => void>;
  destroy: Mock<() => void>;
  pause: Mock<() => void>;
  resume: Mock<() => void>;
  restart: Mock<() => void>;
  end: Mock<() => void>;
  setOption: Mock<(key: string, value: string) => void>;
}

function fakeDefinition(id: string, width = 400, height = 300) {
  const engines: FakeEngine[] = [];
  const callbacks: GameCallbacks[] = [];
  const definition: GameDefinition = {
    id,
    width,
    height,
    aria: `Juego ${id}`,
    create: (_canvas, cb) => {
      callbacks.push(cb);
      const engine: FakeEngine = {
        start: vi.fn(),
        destroy: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        restart: vi.fn(),
        end: vi.fn(),
        setOption: vi.fn(),
      };
      engines.push(engine);
      return engine;
    },
  };
  return { definition, engines, callbacks };
}

@Component({
  imports: [GameCanvasComponent],
  template: `<app-game-canvas
    [definition]="definition()"
    (stateChange)="states.push($event)"
    (gameOver)="scores.push($event)"
  />`,
})
class HostComponent {
  readonly definition = signal<GameDefinition>(fakeDefinition('a').definition);
  readonly states: GameSnapshot[] = [];
  readonly scores: number[] = [];
}

describe('GameCanvasComponent', () => {
  function setup(definition: GameDefinition) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.definition.set(definition);
    fixture.detectChanges();
    TestBed.tick();
    const canvasCmp = fixture.debugElement.children[0].componentInstance as GameCanvasComponent;
    return { fixture, host: fixture.componentInstance, canvasCmp };
  }

  it('pinta el canvas con las dimensiones, el aria-label y el aspect-ratio de la definición', () => {
    const { fixture } = setup(fakeDefinition('a', 480, 640).definition);
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    expect(canvas.className).toBe('game-canvas');
    expect(canvas.getAttribute('width')).toBe('480');
    expect(canvas.getAttribute('height')).toBe('640');
    expect(canvas.getAttribute('aria-label')).toBe('Juego a');
    expect(canvas.style.aspectRatio.replace(/\s/g, '')).toBe('480/640');
    expect(canvas.style.maxWidth).toBe('480px');
  });

  it('crea y arranca el motor una vez', () => {
    const f = fakeDefinition('a');
    setup(f.definition);
    expect(f.engines).toHaveLength(1);
    expect(f.engines[0].start).toHaveBeenCalledTimes(1);
  });

  it('reemite onState y onGameOver del motor', () => {
    const f = fakeDefinition('a');
    const { host } = setup(f.definition);
    const snap: GameSnapshot = { score: 5, status: 'playing', hud: [] };
    f.callbacks[0].onState(snap);
    f.callbacks[0].onGameOver(42);
    expect(host.states).toEqual([snap]);
    expect(host.scores).toEqual([42]);
  });

  it('delega pause/resume/restart/end/setOption en el motor', () => {
    const f = fakeDefinition('a');
    const { canvasCmp } = setup(f.definition);
    canvasCmp.pause();
    canvasCmp.resume();
    canvasCmp.restart();
    canvasCmp.end();
    canvasCmp.setOption('skin', 'neon');
    const e = f.engines[0];
    expect(e.pause).toHaveBeenCalledTimes(1);
    expect(e.resume).toHaveBeenCalledTimes(1);
    expect(e.restart).toHaveBeenCalledTimes(1);
    expect(e.end).toHaveBeenCalledTimes(1);
    expect(e.setOption).toHaveBeenCalledWith('skin', 'neon');
  });

  it('al cambiar la definición destruye el motor anterior y crea el nuevo', () => {
    const a = fakeDefinition('a');
    const b = fakeDefinition('b');
    const { fixture, host, canvasCmp } = setup(a.definition);
    host.definition.set(b.definition);
    fixture.detectChanges();
    TestBed.tick();
    expect(a.engines[0].destroy).toHaveBeenCalledTimes(1);
    expect(b.engines).toHaveLength(1);
    expect(b.engines[0].start).toHaveBeenCalledTimes(1);
    canvasCmp.pause();
    expect(b.engines[0].pause).toHaveBeenCalledTimes(1);
    expect(a.engines[0].pause).not.toHaveBeenCalled();
  });

  it('destruye el motor al destruirse el componente', () => {
    const f = fakeDefinition('a');
    const { fixture } = setup(f.definition);
    fixture.destroy();
    expect(f.engines[0].destroy).toHaveBeenCalledTimes(1);
  });
});
