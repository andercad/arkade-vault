import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Navegación completa del navegador (recarga). Tras login o borrado de cuenta hace falta
 * releer las cookies de sesión y el HTML SSR; el *router* no lo hace. Aislada para poder
 * simularla en tests.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly document = inject(DOCUMENT);

  /** Carga `url` con una navegación completa (no-op fuera del navegador). */
  assign(url: string): void {
    this.document.defaultView?.location.assign(url);
  }
}
