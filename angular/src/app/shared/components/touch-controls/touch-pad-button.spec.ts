import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PadButtonComponent } from './touch-pad-button';

@Component({
  imports: [PadButtonComponent],
  template: `<button appPadButton label="DISPARO" [code]="code()" [disabled]="disabled()">A</button>`,
})
class HostComponent {
  readonly code = signal<string | undefined>('Space');
  readonly disabled = signal(false);
}

describe('PadButtonComponent', () => {
  const events: { type: string; code: string; key: string }[] = [];
  const listener = (e: Event) => {
    const k = e as KeyboardEvent;
    events.push({ type: k.type, code: k.code, key: k.key });
  };

  beforeEach(() => {
    events.length = 0;
    // jsdom no implementa la captura de puntero.
    HTMLElement.prototype.hasPointerCapture ??= () => false;
    HTMLElement.prototype.releasePointerCapture ??= () => undefined;
    window.addEventListener('keydown', listener);
    window.addEventListener('keyup', listener);
  });

  afterEach(() => {
    window.removeEventListener('keydown', listener);
    window.removeEventListener('keyup', listener);
  });

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, btn };
  }

  function pointer(btn: HTMLElement, type: string) {
    btn.dispatchEvent(new PointerEvent(type, { pointerId: 1, bubbles: true }));
  }

  it('expone aria-label y type=button', async () => {
    const { btn } = await setup();
    expect(btn.getAttribute('aria-label')).toBe('DISPARO');
    expect(btn.type).toBe('button');
  });

  it('pointerdown emite keydown y pointerup keyup (una sola vez)', async () => {
    const { btn } = await setup();
    pointer(btn, 'pointerdown');
    pointer(btn, 'pointerdown');
    pointer(btn, 'pointerup');
    pointer(btn, 'pointerup');
    expect(events).toEqual([
      { type: 'keydown', code: 'Space', key: ' ' },
      { type: 'keyup', code: 'Space', key: ' ' },
    ]);
  });

  it('pointerleave suelta la tecla', async () => {
    const { btn } = await setup();
    pointer(btn, 'pointerdown');
    pointer(btn, 'pointerleave');
    expect(events.map((e) => e.type)).toEqual(['keydown', 'keyup']);
  });

  it('sin código no emite nada', async () => {
    const { fixture, btn } = await setup();
    fixture.componentInstance.code.set(undefined);
    fixture.detectChanges();
    pointer(btn, 'pointerdown');
    pointer(btn, 'pointerup');
    expect(events).toEqual([]);
  });

  it('deshabilitado no emite y suelta lo pulsado', async () => {
    const { fixture, btn } = await setup();
    pointer(btn, 'pointerdown');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(events.map((e) => e.type)).toEqual(['keydown', 'keyup']);
    events.length = 0;
    pointer(btn, 'pointerdown');
    expect(events).toEqual([]);
  });

  it('destruir el componente suelta la tecla pulsada', async () => {
    const { fixture, btn } = await setup();
    pointer(btn, 'pointerdown');
    fixture.destroy();
    expect(events.map((e) => e.type)).toEqual(['keydown', 'keyup']);
  });
});
