import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProfileService } from '@shared/services/profile.service';
import { apiErrorMessage } from '@shared/utils/api-error';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href]';

/**
 * «Zona peligrosa» de `/perfil`: botón que abre el modal «Eliminar cuenta», donde hay que
 * escribir el usuario para confirmar (si no coincide, el error sale al pulsar ELIMINAR). El
 * modal es un `dialog` modal: foco atrapado, `Esc`/CANCELAR/fondo cierran y el foco vuelve al
 * botón que lo abrió. Con el borrado hecho emite `deleted`.
 * @example
 * ```html
 * <app-danger-zone [username]="user.name" (deleted)="onDeleted()" />
 * ```
 */
@Component({
  selector: 'app-danger-zone',
  templateUrl: './danger-zone.html',
  styleUrl: './danger-zone.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class DangerZoneComponent {
  private readonly profile = inject(ProfileService);
  private readonly injector = inject(Injector);

  // ========== Inputs / Outputs ==========
  /** Usuario actual: lo que hay que escribir para confirmar. */
  readonly username = input.required<string>();
  /** La cuenta se eliminó en el servidor. */
  readonly deleted = output<void>();

  // ========== State ==========
  protected readonly open = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pending = signal(false);
  private confirm = '';

  // ========== Queries ==========
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  // ========== Event handlers ==========
  protected show(): void {
    this.confirm = '';
    this.error.set(null);
    this.open.set(true);
    afterNextRender(() => this.field()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Cierra el modal (no mientras borra) y devuelve el foco al botón que lo abrió. */
  protected close(): void {
    if (!this.open() || this.pending()) return;
    this.open.set(false);
    this.confirm = '';
    this.error.set(null);
    afterNextRender(() => this.trigger().nativeElement.focus(), { injector: this.injector });
  }

  /** Un clic en el fondo (no dentro del modal) cierra. */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected onInput(event: Event): void {
    this.confirm = (event.target as HTMLInputElement).value;
  }

  /** Mantiene `Tab` y `Shift+Tab` dentro del modal. */
  protected trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = Array.from(
      this.dialog()?.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !items.includes(active as HTMLElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) return;
    if (!this.confirm.trim() || this.confirm.trim().toUpperCase() !== this.username()) {
      return this.error.set('El usuario no coincide.');
    }
    this.error.set(null);
    this.pending.set(true);
    try {
      await firstValueFrom(this.profile.deleteAccount(this.confirm));
      this.deleted.emit();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      this.pending.set(false);
    }
  }
}
