import { Routes } from '@angular/router';
import { guestGuard } from '@shared/guards/guest.guard';

/** Título por defecto, el mismo que `metadata.title` de Next. */
const TITLE = 'Arcade Vault';

/** Las páginas son `export default` y se cargan en diferido con `loadComponent`. */
export const routes: Routes = [
  { path: '', title: TITLE, loadComponent: () => import('@home/pages/home-page/home-page') },
  {
    path: 'juegos',
    title: TITLE,
    loadComponent: () => import('@library/pages/library-page/library-page'),
  },
  {
    path: 'juegos/:id/jugar',
    title: TITLE,
    loadComponent: () => import('@play/pages/play-page/play-page'),
  },
  {
    path: 'juegos/:id',
    title: TITLE,
    loadComponent: () => import('@library/pages/game-detail-page/game-detail-page'),
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
    path: 'login',
    title: TITLE,
    canMatch: [guestGuard],
    loadComponent: () => import('@auth/pages/login-page/login-page'),
  },
  {
    path: '**',
    title: TITLE,
    loadComponent: () => import('@not-found/pages/not-found-page/not-found-page'),
  },
];
