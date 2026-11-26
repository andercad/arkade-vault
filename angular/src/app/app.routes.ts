import { Routes } from '@angular/router';

/** Título por defecto, el mismo que `metadata.title` de Next. */
const TITLE = 'Arcade Vault';

/** Hasta que exista su pantalla real (pasos 3-6 de la SPEC 25). */
const provisional = () => import('./provisional/pages/provisional-page/provisional-page');

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
    data: { name: 'ACERCA DE' },
    loadComponent: provisional,
  },
  { path: 'login', title: TITLE, data: { name: 'LOGIN' }, loadComponent: provisional },
  {
    path: '**',
    title: TITLE,
    loadComponent: () => import('@not-found/pages/not-found-page/not-found-page'),
  },
];
