import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import type { Game } from '@/lib/games';

/** Lectura de juegos a través del BFF (`/api/games/:id`); el navegador no habla con Supabase. */
@Injectable({ providedIn: 'root' })
export class GamesService {
  private readonly http = inject(HttpClient);

  /** Devuelve el juego, `null` si no existe (404) y propaga cualquier otro error. */
  getGame(id: string): Observable<Game | null> {
    return this.http
      .get<Game>(`/api/games/${encodeURIComponent(id)}`)
      .pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === 404
            ? of(null)
            : throwError(() => error),
        ),
      );
  }
}
