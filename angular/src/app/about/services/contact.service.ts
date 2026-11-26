import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ContactInput } from '@/lib/contact';

/** Datos del formulario de contacto; `website` es el honeypot (siempre vacío para un humano). */
export interface ContactMessage extends ContactInput {
  website: string;
}

/**
 * Única vía HTTP a `POST /api/contact`. Los errores llegan como `HttpErrorResponse` con
 * `{ error }` en español (ver `apiErrorMessage`).
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  /** Envía el mensaje; completa sin valor si el servidor responde 204. */
  send(message: ContactMessage): Observable<void> {
    return this.http.post<void>('/api/contact', message);
  }
}
