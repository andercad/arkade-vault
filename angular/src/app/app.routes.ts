import { Routes } from '@angular/router';
import { authGuard } from '@auth/guards/auth.guard';

/** Título por defecto, el mismo que `metadata.title` de Next. */
const TITLE = 'Arcade Vault';

/**
 * Una entrada por funcionalidad, siempre en diferido. `play` va antes que `library` porque
 * `/juegos/:id/jugar` comparte prefijo con `/juegos/:id`. La entrada de `auth` tiene prefijo
 * vacío (sus URL no comparten prefijo) y debe ir antes del comodín.
 */
export const routes: Routes = [
  { path: '', title: TITLE, loadComponent: () => import('@home/pages/home-page/home-page') },
  {
    path: 'juegos/:id/jugar',
    title: TITLE,
    loadComponent: () => import('@play/pages/play-page/play-page'),
  },
  {
    path: 'juegos',
    loadChildren: () => import('@library/library.routes').then((m) => m.LIBRARY_ROUTES),
  },
  {
    path: 'salon-de-la-fama',
    title: TITLE,
    loadComponent: () => import('@hall-of-fame/pages/hall-of-fame-page/hall-of-fame-page'),
  },
  {
    path: 'about',
    title: 'Acerca de | Arcade Vault',
    loadComponent: () => import('@about/pages/about-page/about-page'),
  },
  {
    path: 'perfil',
    title: TITLE,
    canMatch: [authGuard],
    loadComponent: () => import('@profile/pages/profile-page/profile-page'),
  },
  {
    path: '',
    loadChildren: () => import('@auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '**',
    title: TITLE,
    loadComponent: () => import('@not-found/pages/not-found-page/not-found-page'),
  },
];
