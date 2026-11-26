import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { validateContact } from '@/lib/contact';
import { ContactService } from '@about/services/contact.service';
import { apiErrorMessage } from '@shared/utils/api-error';

type Field = 'name' | 'email' | 'message';

/** Valores válidos de relleno para comprobar un campo aislado con `validateContact`. */
const VALID: Record<Field, string> = { name: 'x', email: 'a@b.co', message: 'x' };
/** Duración del temblor del formulario cuando falta algún campo, en ms. */
const SHAKE_MS = 400;
const EMPTY: Record<Field, string> = { name: '', email: '', message: '' };

/**
 * Formulario de contacto: valida con `lib/contact.ts` y envía con `ContactService`. Éxito →
 * terminal de confirmación; fallo → el error del servidor (genérico). Los campos erróneos
 * llevan `aria-invalid` y apuntan al mensaje con `aria-describedby`. `website` es el
 * honeypot: oculto, una persona no lo rellena.
 */
@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  private readonly contact = inject(ContactService);

  // ========== State ==========
  protected readonly values = signal<Record<Field, string>>({ ...EMPTY });
  protected readonly website = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly invalid = signal<readonly Field[]>([]);
  protected readonly shake = signal(false);
  protected readonly pending = signal(false);
  /** Nombre del remitente tras un envío correcto; `null` mientras se muestra el formulario. */
  protected readonly sent = signal<string | null>(null);

  // ========== Event handlers ==========
  protected update(field: Field, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.values.update((v) => ({ ...v, [field]: value }));
  }

  protected updateWebsite(event: Event): void {
    this.website.set((event.target as HTMLInputElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.pending()) return;
    const raw = this.values();
    const result = validateContact(raw);
    if (result.ok) {
      this.error.set(null);
      this.invalid.set([]);
      this.send(result.data.name);
      return;
    }
    this.error.set(result.error);
    this.invalid.set(
      (Object.keys(VALID) as Field[]).filter((f) => !validateContact({ ...VALID, [f]: raw[f] }).ok),
    );
    if (Object.values(raw).some((v) => !v.trim())) {
      this.shake.set(true);
      setTimeout(() => this.shake.set(false), SHAKE_MS);
    }
  }

  /** Vuelve al formulario vacío tras un envío correcto. */
  protected reset(): void {
    this.sent.set(null);
    this.error.set(null);
    this.values.set({ ...EMPTY });
    this.website.set('');
  }

  /** `aria-invalid` del campo. */
  protected isInvalid(field: Field): boolean {
    return this.invalid().includes(field);
  }

  private send(name: string): void {
    this.pending.set(true);
    this.contact.send({ ...this.values(), website: this.website() }).subscribe({
      next: () => {
        this.pending.set(false);
        this.sent.set(name);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
