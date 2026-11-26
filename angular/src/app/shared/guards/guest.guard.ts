import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { SessionService } from '@shared/services/session.service';

/** Solo invitados; con sesión redirige a `/`. */
export const guestGuard: CanMatchFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.whenLoaded();
  return session.user() ? router.parseUrl('/') : true;
};
