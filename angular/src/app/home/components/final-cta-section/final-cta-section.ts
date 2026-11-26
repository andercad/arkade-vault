import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@shared/directives/reveal/reveal';

/** Llamada a la acción final de la home. */
@Component({
  selector: 'app-final-cta-section',
  imports: [RouterLink, RevealDirective],
  templateUrl: './final-cta-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {}
