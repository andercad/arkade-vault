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
import { RouterLink } from '@angular/router';
import type { SessionUser } from '@shared/models/session';
import { AvatarComponent } from '../avatar/avatar';

/**
 * Menú de cuenta del nav: avatar + nombre en un solo botón que despliega «Perfil» y
 * «Cerrar sesión». `Esc` cierra y devuelve el foco al botón; un clic fuera también cierra;
 * ↑/↓/`Home`/`End` mueven el foco entre los elementos. En móvil solo se ve el avatar (CSS).
 * @example
 * ```html
 * <app-account-menu [user]="user" (signedOut)="signOut()" />
 * ```
 */
@Component({
  selector: 'app-account-menu',
  imports: [RouterLink, AvatarComponent],
  templateUrl: './account-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeWithFocus()',
    '(document:mousedown)': 'closeOnOutside($event)',
    '(document:touchstart)': 'closeOnOutside($event)',
  },
})
export class AccountMenuComponent {
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // ========== Inputs / Outputs ==========
  readonly user = input.required<SessionUser>();
  /** El jugador pulsó «Cerrar sesión». */
  readonly signedOut = output<void>();

  // ========== State ==========
  protected readonly open = signal(false);

  // ========== Queries ==========
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  // ========== Event handlers ==========
  protected toggle(): void {
    if (this.open()) return this.closeWithFocus();
    this.open.set(true);
    afterNextRender(() => this.items()[0]?.focus(), { injector: this.injector });
  }

  /** Cierra sin mover el foco (un enlace o un clic fuera ya lo llevan a otro sitio). */
  protected close(): void {
    this.open.set(false);
  }

  protected signOut(): void {
    this.close();
    this.signedOut.emit();
  }

  /** `Esc` / botón: cierra y devuelve el foco al disparador. */
  protected closeWithFocus(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  protected closeOnOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  /** Navegación por teclado entre los elementos del menú. */
  protected onMenuKey(event: KeyboardEvent): void {
    const items = this.items();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const target = {
      ArrowDown: items[(index + 1) % items.length],
      ArrowUp: items[(index - 1 + items.length) % items.length],
      Home: items[0],
      End: items[items.length - 1],
    }[event.key];
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  // ========== Private ==========
  private items(): HTMLElement[] {
    const root = this.menu()?.nativeElement;
    return root ? Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
  }
}
