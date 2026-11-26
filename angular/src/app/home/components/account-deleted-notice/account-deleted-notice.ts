import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Aviso de la home tras eliminar la cuenta (`/?cuenta=eliminada`). Se descarta con «OK» o
 * solo a los 8 s; sin el parámetro no pinta nada.
 * @example
 * ```html
 * <app-account-deleted-notice [account]="cuenta()" />
 * ```
 */
@Component({
  selector: 'app-account-deleted-notice',
  templateUrl: './account-deleted-notice.html',
  styleUrl: './account-deleted-notice.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeletedNoticeComponent {
  // ========== Inputs ==========
  /** Valor del query param `?cuenta=`; solo `eliminada` muestra el aviso. */
  readonly account = input<string | null | undefined>(null);

  // ========== State ==========
  protected readonly dismissed = signal(false);
  protected readonly visible = computed(() => this.account() === 'eliminada' && !this.dismissed());

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Solo en el navegador (nunca un temporizador en el SSR) y únicamente si el aviso se ve.
    afterNextRender(() => {
      if (!this.visible()) return;
      const timer = setTimeout(() => this.dismissed.set(true), 8000);
      destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }
}
