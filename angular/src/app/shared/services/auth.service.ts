import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { from, map, switchMap, type Observable } from 'rxjs';
import { SessionService } from './session.service';

/** Datos del registro. */
export interface SignUpInput {
  username: string;
  email: string;
  password: string;
}

/** Datos del inicio de sesión (`identifier` = usuario o correo). */
export interface SignInInput {
  identifier: string;
  password: string;
}

/** Resultado del registro: `needsConfirmation` si hay que confirmar el correo antes de entrar. */
export interface SignUpResult {
  needsConfirmation: boolean;
  email: string;
}

/**
 * Única vía HTTP a `/api/auth/*`. La sesión vive en cookies `httpOnly` del BFF; los errores
 * llegan como `HttpErrorResponse` con `{ error }` en español (ver `apiErrorMessage`).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  /** Crea la cuenta; con confirmación de correo activa no abre sesión. */
  signUp(input: SignUpInput): Observable<SignUpResult> {
    return this.http.post<SignUpResult>('/api/auth/sign-up', input);
  }

  /** Inicia sesión por usuario o correo. El llamante recarga la página para releer la sesión. */
  signIn(input: SignInInput): Observable<void> {
    return this.http.post<void>('/api/auth/sign-in', input);
  }

  /** Pide el correo de recuperación; responde igual exista o no la cuenta. */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>('/api/auth/forgot-password', { email });
  }

  /**
   * Canjea el `code` del enlace de recuperación y fija la nueva contraseña en una sola llamada.
   * El código es de un solo uso: también deja la sesión abierta.
   */
  recover(code: string, password: string): Observable<void> {
    return this.http.post<void>('/api/auth/recovery', { code, password });
  }

  /** Cierra la sesión y refresca `SessionService` (el nav vuelve a invitado). */
  signOut(): Observable<void> {
    return this.http
      .post<void>('/api/auth/sign-out', {})
      .pipe(switchMap(() => from(this.session.refresh()).pipe(map(() => undefined))));
  }
}
