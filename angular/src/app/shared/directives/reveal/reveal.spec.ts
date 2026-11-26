import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RevealDirective } from './reveal';

@Component({ imports: [RevealDirective], template: `<section appReveal>x</section>` })
class HostComponent {}

type Callback = (entries: { isIntersecting: boolean }[]) => void;

describe('RevealDirective', () => {
  let callback: Callback | undefined;
  const disconnect = vi.fn();

  function stubObserver(): void {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: Callback) {
          callback = cb;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  }

  function stubReducedMotion(matches: boolean): void {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));
  }

  function create(): { fixture: ComponentFixture<HostComponent>; el: HTMLElement } {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement.querySelector('section') as HTMLElement };
  }

  beforeEach(() => {
    callback = undefined;
    disconnect.mockClear();
    stubReducedMotion(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('siempre lleva la clase reveal y no .in hasta intersectar', () => {
    stubObserver();
    const { el } = create();
    expect(el.classList.contains('reveal')).toBe(true);
    expect(el.classList.contains('in')).toBe(false);
  });

  it('añade .in al intersectar y desconecta el observer', () => {
    stubObserver();
    const { fixture, el } = create();
    callback?.([{ isIntersecting: true }]);
    fixture.detectChanges();
    expect(el.classList.contains('in')).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });

  it('no añade .in si no intersecta', () => {
    stubObserver();
    const { fixture, el } = create();
    callback?.([{ isIntersecting: false }]);
    fixture.detectChanges();
    expect(el.classList.contains('in')).toBe(false);
  });

  it('sin IntersectionObserver añade .in directamente', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { fixture, el } = create();
    fixture.detectChanges();
    expect(el.classList.contains('in')).toBe(true);
  });

  it('con prefers-reduced-motion añade .in sin observer', () => {
    stubObserver();
    stubReducedMotion(true);
    const { fixture, el } = create();
    fixture.detectChanges();
    expect(el.classList.contains('in')).toBe(true);
    expect(callback).toBeUndefined();
  });
});
