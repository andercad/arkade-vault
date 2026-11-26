import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import type { Game } from '@/lib/games';
import type { ScoreRow } from '@/lib/scores';

/** Lectura de juegos y rankings a través del BFF (`/api/games*`); el navegador no habla con Supabase. */
@Injectable({ providedIn: 'root' })
export class GamesService {
  // ========== Dependencies ==========
  private readonly http = inject(HttpClient);

  // ========== HTTP ==========

  /** Catálogo completo ordenado por `sort_order`. */
  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>('/api/games');
  }

  /** Top `limit` (1-12) del ranking de un juego. */
  getTopScores(id: string, limit: number): Observable<ScoreRow[]> {
    return this.http.get<ScoreRow[]>(`/api/games/${encodeURIComponent(id)}/scores`, {
      params: { limit },
    });
  }

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
