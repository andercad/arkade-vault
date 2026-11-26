import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, switchMap, from, type Observable } from 'rxjs';
import { SessionService } from '@shared/services/session.service';

/** Datos del cambio de contraseña. */
export interface ChangePasswordInput {
  current: string;
  password: string;
  repeat: string;
}

/**
 * Única vía HTTP a `/api/profile/*`. El servidor identifica al jugador por la cookie de sesión:
 * nunca se envía su id. Los errores llegan como `HttpErrorResponse` con `{ error }` en español.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  // ========== Dependencies ==========
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  // ========== HTTP ==========

  /** Cambia el usuario (el servidor lo pone en mayúsculas) y refresca la sesión; devuelve el nombre nuevo. */
  updateUsername(username: string): Observable<string> {
    return this.http
      .patch<{ name: string }>('/api/profile/username', { username })
      .pipe(switchMap(({ name }) => from(this.session.refresh()).pipe(map(() => name))));
  }

  /** Cambia la contraseña verificando la actual; cierra las sesiones de otros dispositivos. */
  changePassword(input: ChangePasswordInput): Observable<void> {
    return this.http.post<void>('/api/profile/password', input);
  }

  /** Elimina la cuenta si `confirm` coincide con el usuario (en cascada: perfil y puntuaciones). */
  deleteAccount(confirm: string): Observable<void> {
    return this.http.delete<void>('/api/profile', { body: { confirm } });
  }
}
