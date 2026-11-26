import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HOME_STATS } from '@/lib/home';
import { RevealDirective } from '@shared/directives/reveal/reveal';

/** Banda de estadísticas de la home (datos de `lib/home`). */
@Component({
  selector: 'app-stats-section',
  imports: [RevealDirective],
  templateUrl: './stats-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsSectionComponent {
  protected readonly stats = HOME_STATS;
}
