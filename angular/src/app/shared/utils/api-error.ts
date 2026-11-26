import { HttpErrorResponse } from '@angular/common/http';
import { GENERIC_ERROR } from '@/lib/auth-errors';

/**
 * Mensaje de un error del BFF: el `{ error }` en español que devuelve `/api/*`, o el genérico
 * si la respuesta no lo trae (red caída, 5xx sin cuerpo…).
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: unknown } | null;
    if (typeof body?.error === 'string' && body.error) return body.error;
  }
  return GENERIC_ERROR;
}
