import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '@shared/directives/reveal/reveal';
import { AboutHeroComponent } from '../../components/about-hero/about-hero';
import { ContactFormComponent } from '../../components/contact-form/contact-form';

/** Ruta `/about` (prerenderizada): hero y bloque de contacto. No lee datos. */
@Component({
  selector: 'app-about-page',
  imports: [RevealDirective, AboutHeroComponent, ContactFormComponent],
  templateUrl: './about-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AboutPageComponent {}
