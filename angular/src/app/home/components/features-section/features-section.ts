import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FEATURES } from '@/lib/home';
import { RevealDirective } from '@shared/directives/reveal/reveal';
import { FeatureIconComponent } from '../feature-icon/feature-icon';

/** Sección «¿Por qué Arcade Vault?»: tarjetas de características (datos de `lib/home`). */
@Component({
  selector: 'app-features-section',
  imports: [RevealDirective, FeatureIconComponent],
  templateUrl: './features-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesSectionComponent {
  protected readonly features = FEATURES;
}
