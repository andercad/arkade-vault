import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountDeletedNoticeComponent } from '../../components/account-deleted-notice/account-deleted-notice';
import { ActivitySectionComponent } from '../../components/activity-section/activity-section';
import { FeaturesSectionComponent } from '../../components/features-section/features-section';
import { FinalCtaSectionComponent } from '../../components/final-cta-section/final-cta-section';
import { GamesSectionComponent } from '../../components/games-section/games-section';
import { PricingSectionComponent } from '../../components/pricing-section/pricing-section';
import { SilhouettesComponent } from '../../components/silhouettes/silhouettes';
import { StatsSectionComponent } from '../../components/stats-section/stats-section';

/** Ruta `/`: hero y secciones de la home. Cada sección con datos los carga por su cuenta. */
@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    AccountDeletedNoticeComponent,
    SilhouettesComponent,
    FeaturesSectionComponent,
    GamesSectionComponent,
    StatsSectionComponent,
    ActivitySectionComponent,
    PricingSectionComponent,
    FinalCtaSectionComponent,
  ],
  templateUrl: './home-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePageComponent {
  // ========== Inputs ==========
  /** Query param `?cuenta=` (binding de la ruta): `eliminada` muestra el aviso. */
  readonly cuenta = input<string>();
}
