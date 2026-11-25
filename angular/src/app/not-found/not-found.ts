import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página «no encontrado»: id de juego desconocido y rutas sin coincidencia (`**`). */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="nf" aria-labelledby="nf-title">
      <h1 id="nf-title" class="pixel nf-title">NO ENCONTRADO</h1>
      <p class="nf-hint">La página que buscas no existe.</p>
      <a routerLink="/" class="btn">VOLVER AL INICIO</a>
    </section>
  `,
  styles: `
    .nf {
      text-align: center;
      padding: 80px 24px;
    }
    .nf-title {
      color: var(--ink-faint);
      font-size: 14px;
      margin: 0 0 16px;
    }
    .nf-hint {
      color: var(--ink-dim);
      margin: 0 0 24px;
    }
  `,
})
export class NotFoundComponent {}
