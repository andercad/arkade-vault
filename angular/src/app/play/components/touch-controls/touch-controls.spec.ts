import { TestBed } from '@angular/core/testing';
import type { TouchControls } from '@/lib/game-engine';
import { TouchControlsComponent } from './touch-controls';

const CONTROLS: TouchControls = {
  dpad: { left: 'ArrowLeft', right: 'ArrowRight' },
  actions: [
    { code: 'Space', label: 'DISPARO' },
    { code: 'KeyZ', label: 'GIRO' },
  ],
};

describe('TouchControlsComponent', () => {
  const events: { type: string; code: string; key: string }[] = [];
  const listener = (e: Event) => {
    const k = e as KeyboardEvent;
    events.push({ type: k.type, code: k.code, key: k.key });
  };

  beforeEach(() => {
    events.length = 0;
    window.addEventListener('keydown', listener);
    window.addEventListener('keyup', listener);
  });

  afterEach(() => {
    window.removeEventListener('keydown', listener);
    window.removeEventListener('keyup', listener);
  });

  function setup(controls: TouchControls = CONTROLS, disabled = false) {
    const fixture = TestBed.createComponent(TouchControlsComponent);
    fixture.componentRef.setInput('controls', controls);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    TestBed.tick();
    const el = fixture.nativeElement as HTMLElement;
    const button = (cls: string) => {
      const b = el.querySelector<HTMLButtonElement>(`button.${cls}`)!;
      // jsdom no implementa la captura de puntero.
      b.hasPointerCapture = () => false;
      return b;
    };
    return { fixture, el, button };
  }

  it('pinta el mando con role=group, 4 direcciones y hub', () => {
    const { el } = setup();
    const gp = el.querySelector('.gp')!;
    expect(gp.getAttribute('role')).toBe('group');
    expect(gp.getAttribute('aria-label')).toBe('Mando táctil');
    expect(el.querySelectorAll('.gp-dpad button.dp')).toHaveLength(4);
    expect(el.querySelector('.dp-hub-gem')).toBeTruthy();
  });

  it('direcciones sin tecla quedan deshabilitadas', () => {
    const { button } = setup();
    expect(button('dp-left').disabled).toBe(false);
    expect(button('dp-right').disabled).toBe(false);
    expect(button('dp-up').disabled).toBe(true);
    expect(button('dp-down').disabled).toBe(true);
  });

  it('acciones: A (magenta) a la derecha del todo, B a su izquierda, con su rótulo', () => {
    const { el } = setup();
    const letters = [...el.querySelectorAll('.ab-letter')].map((n) => n.textContent);
    expect(letters).toEqual(['B', 'A']);
    const labels = [...el.querySelectorAll('.ab-label')].map((n) => n.textContent);
    expect(labels).toEqual(['GIRO', 'DISPARO']);
    expect(el.querySelector('button.ab.a')!.getAttribute('aria-label')).toBe('DISPARO');
    expect(el.querySelector('button.ab.b')!.getAttribute('aria-label')).toBe('GIRO');
  });

  it('sin acciones no pinta la columna derecha', () => {
    const { el } = setup({ dpad: { up: 'ArrowUp' }, actions: [] });
    expect(el.querySelector('.gp-col-right')).toBeNull();
  });

  it('pulsar emite keydown y soltar keyup en window (Space → key " ")', () => {
    const { button } = setup();
    const a = button('ab.a');
    a.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    a.dispatchEvent(new Event('pointerup', { bubbles: true }));
    expect(events).toEqual([
      { type: 'keydown', code: 'Space', key: ' ' },
      { type: 'keyup', code: 'Space', key: ' ' },
    ]);
  });

  it('un segundo pointerdown sin soltar no repite keydown', () => {
    const { button } = setup();
    const left = button('dp-left');
    left.dispatchEvent(new Event('pointerdown'));
    left.dispatchEvent(new Event('pointerdown'));
    expect(events.filter((e) => e.type === 'keydown')).toHaveLength(1);
  });

  it('arrastrar el dedo fuera (pointerleave) suelta la tecla', () => {
    const { button } = setup();
    const left = button('dp-left');
    left.dispatchEvent(new Event('pointerdown'));
    left.dispatchEvent(new Event('pointerleave'));
    expect(events.map((e) => e.type)).toEqual(['keydown', 'keyup']);
  });

  it('desactivar el mando (pausa/fin) suelta lo pulsado', () => {
    const { fixture, button } = setup();
    button('ab.a').dispatchEvent(new Event('pointerdown'));
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    TestBed.tick();
    expect(events.map((e) => e.type)).toEqual(['keydown', 'keyup']);
  });

  it('con el mando desactivado no emite nada', () => {
    const { button } = setup(CONTROLS, true);
    const a = button('ab.a');
    expect(a.disabled).toBe(true);
    a.dispatchEvent(new Event('pointerdown'));
    expect(events).toEqual([]);
  });

  it('destruir el componente suelta la tecla pulsada', () => {
    const { fixture, button } = setup();
    button('dp-right').dispatchEvent(new Event('pointerdown'));
    fixture.destroy();
    expect(events.map((e) => e.type)).toEqual(['keydown', 'keyup']);
  });

  it('un keydown físico (isTrusted) ilumina el botón; uno sintético no', () => {
    const { fixture, button } = setup();
    const a = button('ab.a');
    // jsdom no puede crear eventos de confianza: los sintéticos del propio mando no iluminan.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    fixture.detectChanges();
    expect(a.classList.contains('on')).toBe(false);
  });
});
