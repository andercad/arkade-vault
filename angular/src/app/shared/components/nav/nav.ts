import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';

interface NavLink {
  path: string;
  label: string;
  /** Activo solo en la ruta exacta (Inicio); el resto, también en sus subrutas. */
  exact: boolean;
}

/**
 * Navegación principal: logo, enlaces con estado activo, créditos, botón de sesión y panel
 * móvil. El panel se abre con la hamburguesa; `Esc`, el *backdrop* o un enlace lo cierran y
 * el foco vuelve al botón. Sin sesión hasta la SPEC 26: el botón es siempre «Iniciar Sesión».
 * @example
 * ```html
 * <app-nav />
 * ```
 */
@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class NavComponent {
  private readonly injector = inject(Injector);

  // ========== Constants ==========
  protected readonly links: readonly NavLink[] = [
    { path: '/', label: 'Inicio', exact: true },
    { path: '/juegos', label: 'Biblioteca', exact: false },
    { path: '/salon-de-la-fama', label: 'Salón de la Fama', exact: false },
    { path: '/about', label: 'Acerca de', exact: false },
  ];
  protected readonly exactMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
  protected readonly prefixMatch: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  // ========== State ==========
  /** Panel móvil abierto. */
  protected readonly open = signal(false);

  // ========== Queries ==========
  private readonly hamburger = viewChild.required<ElementRef<HTMLButtonElement>>('hamburger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  // ========== Public API ==========
  /** Abre el panel y mueve el foco a su primer enlace. */
  protected openPanel(): void {
    this.open.set(true);
    afterNextRender(() => this.panel().nativeElement.querySelector<HTMLElement>('a')?.focus(), {
      injector: this.injector,
    });
  }

  /** Cierra el panel (si está abierto) y devuelve el foco a la hamburguesa. */
  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.hamburger().nativeElement.focus();
  }
}
