import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { SessionService } from '@shared/services/session.service';

/** Solo con sesión; si no, redirige a `/login` (complementa el 302 de Express en `/perfil`). */
export const authGuard: CanMatchFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.whenLoaded();
  return session.user() ? true : router.parseUrl('/login');
};
