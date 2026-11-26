import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FAQ, PRICING_FEATURES } from '@/lib/home';
import { RevealDirective } from '@shared/directives/reveal/reveal';

/** Sección de precios (plan único gratuito) y preguntas frecuentes; datos de `lib/home`. */
@Component({
  selector: 'app-pricing-section',
  imports: [RouterLink, RevealDirective],
  templateUrl: './pricing-section.html',
  styleUrl: './pricing-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingSectionComponent {
  protected readonly features = PRICING_FEATURES;
  protected readonly faq = FAQ;
}
