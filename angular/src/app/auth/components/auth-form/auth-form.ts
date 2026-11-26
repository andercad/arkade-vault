import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';
import { NavigationService } from '@shared/services/navigation.service';
import { apiErrorMessage } from '@shared/utils/api-error';
import { firstValueFrom } from 'rxjs';
import { validatePassword, validateSignIn, validateSignUp } from '@/lib/auth-validation';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password';

type Tab = 'in' | 'up';
type Field = 'user' | 'email' | 'pass';

/** Valores válidos de relleno para comprobar un campo aislado con las reglas de `lib/`. */
const OK_EMAIL = 'a@b.co';
const OK_USERNAME = 'abc';
const OK_PASSWORD = 'Aa1!aaaa';

/**
 * Formulario de acceso: pestañas iniciar sesión (usuario o correo) / crear cuenta, validación
 * con `lib/auth-validation.ts` antes de enviar a `AuthService`, botones Google/GitHub,
 * «¿Olvidaste tu contraseña?» y «Jugar como invitado». Tras entrar hace una navegación completa
 * a `/` para releer la sesión; un registro que exige confirmar el correo muestra «Revisa tu
 * correo». Google/GitHub navegan a `/auth/oauth/:provider` (ruta Express).
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
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);

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
  /** Envío en curso: bloquea reenvíos y deshabilita el botón. */
  protected readonly pending = signal(false);
  /** Correo al que se envió el enlace de confirmación; muestra «Revisa tu correo». */
  protected readonly sentTo = signal<string | null>(null);

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

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) return;
    const user = this.user().trim();
    const email = this.email().trim();
    const pass = this.pass();
    const signIn = this.tab() === 'in';
    const message = signIn
      ? validateSignIn({ identifier: user, password: pass })
      : validateSignUp({ username: user, email, password: pass });

    this.notice.set(null);
    this.error.set(message);
    this.invalid.set(message ? this.failingFields(signIn, user, email, pass) : []);
    if (message) return;

    this.pending.set(true);
    try {
      if (signIn) {
        await firstValueFrom(this.auth.signIn({ identifier: user, password: pass }));
        this.navigation.assign('/');
      } else {
        const result = await firstValueFrom(
          this.auth.signUp({ username: user, email, password: pass }),
        );
        if (result.needsConfirmation) {
          this.sentTo.set(result.email);
          this.pass.set('');
        } else {
          this.navigation.assign('/');
        }
      }
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.pending.set(false);
    }
  }

  /** Vuelve al acceso desde «Revisa tu correo». */
  protected backToSignIn(): void {
    this.sentTo.set(null);
    this.tab.set('in');
  }

  /** Inicia OAuth con una navegación completa: el servidor guarda el verificador PKCE. */
  protected oauth(provider: 'google' | 'github'): void {
    this.navigation.assign(`/auth/oauth/${provider}`);
  }

  protected guest(): void {
    void this.router.navigateByUrl('/');
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
