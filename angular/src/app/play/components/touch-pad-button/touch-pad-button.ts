import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

/** Emite una tecla virtual en `window` (los motores escuchan ahí). */
function emit(type: 'keydown' | 'keyup', code: string): void {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code, bubbles: true }),
  );
}

/**
 * Un botón = una tecla virtual: `keydown` al pulsar, `keyup` al soltar o perder el dedo.
 * Se ilumina (`.on`) con la tecla física equivalente (solo eventos `isTrusted`).
 * @example
 * ```html
 * <button appPadButton class="ab a" code="Space" label="DISPARO" [disabled]="paused()">A</button>
 * ```
 */
@Component({
  // Atributo sobre `<button>` nativo: conserva la semántica y el teclado del elemento.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[appPadButton]',
  templateUrl: './touch-pad-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    tabindex: '-1',
    '[attr.aria-label]': 'label()',
    '[disabled]': 'disabled()',
    '[class.on]': 'lit() && !disabled()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'release()',
    '(pointercancel)': 'release()',
    '(pointerleave)': 'release()',
    '(lostpointercapture)': 'release()',
    '(contextmenu)': '$event.preventDefault()',
    // Sin foco: Espacio/flechas siguen yendo al juego.
    '(mousedown)': '$event.preventDefault()',
  },
})
export class PadButtonComponent {
  // ========== Inputs ==========
  /** `KeyboardEvent.code` que emite; sin código el botón no hace nada. */
  readonly code = input<string | undefined>();
  readonly disabled = input(false);
  readonly label = input.required<string>();

  // ========== State ==========
  protected readonly lit = signal(false);
  private pressed = false;

  // ========== Lifecycle ==========
  constructor() {
    const destroyRef = inject(DestroyRef);

    // Mando inactivo (pausa / fin): suelta lo que estuviera pulsado.
    effect(() => {
      if (this.disabled()) untracked(() => this.release());
    });

    afterNextRender(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (!e.isTrusted || e.repeat || e.code !== this.code() || this.disabled()) return;
        this.lit.set(true);
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.isTrusted && e.code === this.code()) this.lit.set(false);
      };
      const onBlur = () => {
        this.lit.set(false);
        this.release();
      };
      // Nunca dejar una tecla pegada al cambiar de pestaña o app.
      const onHidden = () => {
        if (document.visibilityState === 'hidden') this.release();
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onHidden);
      destroyRef.onDestroy(() => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onHidden);
        this.release();
      });
    });
  }

  // ========== Public methods ==========
  /** Suelta la tecla virtual si estaba pulsada. */
  release(): void {
    const code = this.code();
    if (!this.pressed || !code) return;
    this.pressed = false;
    emit('keyup', code);
  }

  // ========== Private methods ==========
  protected onPointerDown(e: PointerEvent): void {
    const code = this.code();
    // Los hijos (svg/span) reciben pointerdown aunque el botón esté disabled.
    if (this.pressed || !code || this.disabled()) return;
    // El táctil captura el puntero de forma implícita: soltarlo permite que pointerleave
    // se dispare al arrastrar el dedo fuera del botón.
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
    this.pressed = true;
    emit('keydown', code);
  }
}
