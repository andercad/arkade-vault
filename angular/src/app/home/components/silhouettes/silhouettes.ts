import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Siluetas pixel flotantes del hero: puramente decorativas (`aria-hidden`). */
@Component({
  selector: 'app-silhouettes',
  templateUrl: './silhouettes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SilhouettesComponent {}
