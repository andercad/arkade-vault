import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { validateContact } from '@/lib/contact';

type Field = 'name' | 'email' | 'message';

/** Valores válidos de relleno para comprobar un campo aislado con `validateContact`. */
const VALID: Record<Field, string> = { name: 'x', email: 'a@b.co', message: 'x' };
/** Duración del temblor del formulario cuando falta algún campo, en ms. */
const SHAKE_MS = 400;

/**
 * Formulario de contacto (solo UI hasta la SPEC 26): valida con `lib/contact.ts` y, si es
 * válido, avisa «Disponible próximamente» sin hacer ninguna petición. Los campos erróneos
 * llevan `aria-invalid` y apuntan al mensaje con `aria-describedby`.
 */
@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  // ========== State ==========
  protected readonly values = signal<Record<Field, string>>({ name: '', email: '', message: '' });
  protected readonly error = signal<string | null>(null);
  protected readonly invalid = signal<readonly Field[]>([]);
  protected readonly shake = signal(false);
  /** Envío válido: mensaje «Disponible próximamente». */
  protected readonly soon = signal(false);

  // ========== Event handlers ==========
  protected update(field: Field, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.values.update((v) => ({ ...v, [field]: value }));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const raw = this.values();
    const result = validateContact(raw);
    if (!('error' in result)) {
      this.error.set(null);
      this.invalid.set([]);
      this.soon.set(true);
      return;
    }
    this.soon.set(false);
    this.error.set(result.error);
    this.invalid.set(
      (Object.keys(VALID) as Field[]).filter((f) => !validateContact({ ...VALID, [f]: raw[f] }).ok),
    );
    if (Object.values(raw).some((v) => !v.trim())) {
      this.shake.set(true);
      setTimeout(() => this.shake.set(false), SHAKE_MS);
    }
  }

  /** `aria-invalid` del campo. */
  protected isInvalid(field: Field): boolean {
    return this.invalid().includes(field);
  }
}
