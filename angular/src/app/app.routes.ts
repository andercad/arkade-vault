import { Routes } from '@angular/router';

/** Título por defecto, el mismo que `metadata.title` de Next. */
const TITLE = 'Arcade Vault';

/** Hasta que exista su pantalla real (pasos 3-6 de la SPEC 25). */
const provisional = () => import('./provisional/pages/provisional-page/provisional-page');

/** Las páginas son `export default` y se cargan en diferido con `loadComponent`. */
export const routes: Routes = [
  { path: '', title: TITLE, data: { name: 'INICIO' }, loadComponent: provisional },
  { path: 'juegos', title: TITLE, data: { name: 'BIBLIOTECA' }, loadComponent: provisional },
  {
    path: 'juegos/:id/jugar',
    title: TITLE,
    loadComponent: () => import('@play/pages/play-page/play-page'),
  },
  { path: 'juegos/:id', title: TITLE, data: { name: 'DETALLE' }, loadComponent: provisional },
  {
    path: 'salon-de-la-fama',
    title: TITLE,
    data: { name: 'SALÓN DE LA FAMA' },
    loadComponent: provisional,
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
