import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  PLATFORM_ID,
  REQUEST_CONTEXT,
  TransferState,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type { SessionUser } from '@shared/models/session';

const SESSION_KEY = makeStateKey<SessionUser | null>('session-user');

/**
 * Única fuente del jugador actual. En el servidor lo lee de `REQUEST_CONTEXT` (lo fija
 * `server.ts`) y lo vuelca en `TransferState`; en el navegador lo recupera de ahí o, en
 * rutas `Client` sin SSR, llama a `GET /api/auth/me`. No hace mutaciones ni usa `supabase-js`.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  // ========== Dependencies ==========
  private readonly http = inject(HttpClient);
  private readonly transfer = inject(TransferState);

  // ========== State ==========
  private readonly userState = signal<SessionUser | null>(null);
  private readonly loadingState = signal(true);
  private pending: Promise<void> | null = null;

  // ========== Computed ==========
  /** Jugador con sesión, o `null` (invitado). */
  readonly user = this.userState.asReadonly();
  /** `true` hasta conocer si hay sesión. */
  readonly loading = this.loadingState.asReadonly();

  // ========== Lifecycle ==========
  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      const context = inject(REQUEST_CONTEXT, { optional: true }) as {
        user?: SessionUser | null;
      } | null;
      this.set(context?.user ?? null);
      this.transfer.set(SESSION_KEY, this.userState());
    } else if (this.transfer.hasKey(SESSION_KEY)) {
      this.set(this.transfer.get(SESSION_KEY, null));
    } else {
      void this.refresh();
    }
  }

  // ========== Public methods ==========

  /** Vuelve a leer la sesión del servidor (tras login, logout o borrado de cuenta). */
  refresh(): Promise<void> {
    this.loadingState.set(true);
    this.pending = firstValueFrom(this.http.get<{ user: SessionUser | null }>('/api/auth/me'))
      .then((res) => this.set(res.user))
      .catch(() => this.set(null));
    return this.pending;
  }

  /** Resuelve cuando se conoce la sesión (los guards esperan a esto). */
  whenLoaded(): Promise<void> {
    return this.pending ?? Promise.resolve();
  }

  // ========== Private methods ==========

  private set(user: SessionUser | null): void {
    this.userState.set(user);
    this.loadingState.set(false);
  }
}
