/** Jugador con sesión, tal y como lo resuelve el BFF (`/api/auth/me` y `REQUEST_CONTEXT`). */
export interface SessionUser {
  id: string;
  /** `profiles.username`; `PLAYER` si falta. */
  name: string;
  /** Foto de la red social (solo `https`); `null` → iniciales. */
  avatarUrl: string | null;
  /** `app_metadata.providers` incluye `email`. */
  hasPassword: boolean;
}
