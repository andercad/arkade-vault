import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Paleta neón del navbar; el tono se elige de forma estable a partir del nombre. */
const TONES = ['cyan', 'magenta', 'violet', 'green', 'yellow', 'orange'] as const;

/** Tono estable por hash del nombre. */
export function toneFor(name: string): (typeof TONES)[number] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/** Hasta dos iniciales alfanuméricas en mayúsculas (`?` si no hay ninguna). */
export function initialsFor(name: string): string {
  return (name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '?').toUpperCase();
}

/**
 * Avatar circular: foto (solo `https`) o iniciales sobre un tono neón estable. Es decorativo
 * (`aria-hidden`): el nombre del jugador siempre va escrito al lado. Si la foto falla, cae a
 * las iniciales.
 * @example
 * ```html
 * <app-avatar [name]="user.name" [avatarUrl]="user.avatarUrl" [size]="36" />
 * ```
 */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  // ========== Inputs ==========
  readonly name = input.required<string>();
  readonly avatarUrl = input<string | null>(null);
  /** Lado en px. */
  readonly size = input(32);

  // ========== State ==========
  /** URL que ya falló: si cambia la foto se vuelve a intentar. */
  protected readonly failedUrl = signal<string | null>(null);

  // ========== Derived ==========
  protected readonly tone = computed(() => toneFor(this.name()));
  protected readonly initials = computed(() => initialsFor(this.name()));
  protected readonly fontSize = computed(() => Math.round(this.size() * 0.34));
  protected readonly photo = computed(() => {
    const url = this.avatarUrl();
    return url && /^https:\/\//.test(url) && this.failedUrl() !== url ? url : null;
  });
}
