import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { validatePassword, validateSignIn, validateSignUp } from '@/lib/auth-validation';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password';

type Tab = 'in' | 'up';
type Field = 'user' | 'email' | 'pass';

/** Aviso de las acciones que dependen de la sesión (SPEC 26). */
const SOON = 'Disponible próximamente.';
/** Valores válidos de relleno para comprobar un campo aislado con las reglas de `lib/`. */
const OK_EMAIL = 'a@b.co';
const OK_USERNAME = 'abc';
const OK_PASSWORD = 'Aa1!aaaa';

/**
 * Formulario de acceso (solo UI hasta la SPEC 26): pestañas iniciar sesión / crear cuenta,
 * validación con `lib/auth-validation.ts`, botones Google/GitHub, «¿Olvidaste tu contraseña?»
 * y «Jugar como invitado». Un envío válido, OAuth y la recuperación avisan «Disponible
 * próximamente» sin hacer ninguna petición.
 */
@Component({
  selector: 'app-auth-form',
  imports: [ForgotPasswordComponent],
  templateUrl: './auth-form.html',
  styleUrl: './auth-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthFormComponent {
  private readonly router = inject(Router);

  // ========== Inputs ==========
  /** Error inicial (p. ej. fallo del callback OAuth). */
  readonly initialError = input<string | null>(null);
  /** Aviso inicial (p. ej. «Email confirmado»). */
  readonly initialNotice = input<string | null>(null);

  // ========== State ==========
  protected readonly tab = signal<Tab>('in');
  protected readonly user = signal('');
  protected readonly email = signal('');
  protected readonly pass = signal('');
  protected readonly forgot = signal(false);
  protected readonly error = linkedSignal<string | null>(() => this.initialError());
  protected readonly notice = linkedSignal<string | null>(() => this.initialNotice());
  protected readonly invalid = signal<readonly Field[]>([]);

  // ========== Event handlers ==========
  protected switchTab(next: Tab): void {
    this.tab.set(next);
    this.error.set(null);
    this.notice.set(null);
    this.invalid.set([]);
  }

  protected update(field: Field, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    (field === 'user' ? this.user : field === 'email' ? this.email : this.pass).set(value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const user = this.user().trim();
    const email = this.email().trim();
    const pass = this.pass();
    const signIn = this.tab() === 'in';
    const message = signIn
      ? validateSignIn({ identifier: user, password: pass })
      : validateSignUp({ username: user, email, password: pass });

    this.notice.set(message ? null : SOON);
    this.error.set(message);
    this.invalid.set(message ? this.failingFields(signIn, user, email, pass) : []);
  }

  protected oauth(): void {
    this.error.set(null);
    this.invalid.set([]);
    this.notice.set(SOON);
  }

  protected guest(): void {
    void this.router.navigateByUrl('/juegos');
  }

  protected openForgot(): void {
    this.error.set(null);
    this.notice.set(null);
    this.forgot.set(true);
  }

  protected isInvalid(field: Field): boolean {
    return this.invalid().includes(field);
  }

  // ========== Private ==========
  /** Campos que incumplen las reglas, comprobados de uno en uno con relleno válido. */
  private failingFields(signIn: boolean, user: string, email: string, pass: string): Field[] {
    const failing: Field[] = [];
    if (signIn) {
      if (validateSignIn({ identifier: user, password: 'x' })) failing.push('user');
      if (!pass) failing.push('pass');
      return failing;
    }
    if (validateSignUp({ username: user, email: OK_EMAIL, password: OK_PASSWORD })) {
      failing.push('user');
    }
    if (validateSignUp({ username: OK_USERNAME, email, password: OK_PASSWORD })) {
      failing.push('email');
    }
    if (validatePassword(pass)) failing.push('pass');
    return failing;
  }
}
