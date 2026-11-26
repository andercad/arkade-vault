import { Routes } from '@angular/router';
import { guestGuard } from '@auth/guards/guest.guard';

/**
 * Rutas de acceso. Se montan con prefijo vacío en `app.routes.ts` porque sus URL no comparten
 * prefijo (`/login`, `/auth/reset-password`); si ninguna coincide, el router sigue con las demás.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Arcade Vault',
    canMatch: [guestGuard],
    loadComponent: () => import('@auth/pages/login-page/login-page'),
  },
  {
    path: 'auth/reset-password',
    title: 'Arcade Vault',
    loadComponent: () => import('@auth/pages/reset-password-page/reset-password-page'),
  },
];
