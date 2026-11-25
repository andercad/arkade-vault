import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NotFoundComponent } from '@shared/components/not-found/not-found';

/** Página de ruta para cualquier URL sin coincidencia (`**`); el servidor responde 404. */
@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundComponent],
  templateUrl: './not-found-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPageComponent {}
