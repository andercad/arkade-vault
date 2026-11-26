import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { RecentScoreView, TopTodayRow } from '@shared/models/scores';

/** Actividad de puntuaciones a través del BFF (`/api/scores/*`); el navegador no habla con Supabase. */
@Injectable({ providedIn: 'root' })
export class ScoresService {
  private readonly http = inject(HttpClient);

  /** Últimas 8 puntuaciones; `ago` ya viene calculado en servidor. */
  getRecent(): Observable<RecentScoreView[]> {
    return this.http.get<RecentScoreView[]>('/api/scores/recent');
  }

  /** Top 5 de las últimas 24 h. */
  getTopToday(): Observable<TopTodayRow[]> {
    return this.http.get<TopTodayRow[]>('/api/scores/top-today');
  }
}
