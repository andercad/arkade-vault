import { Routes } from '@angular/router';

/** Las páginas son `export default` y se cargan en diferido con `loadComponent`. */
export const routes: Routes = [
  {
    path: 'juegos/:id/jugar',
    loadComponent: () => import('@play/pages/play-page/play-page'),
  },
  {
    path: '**',
    loadComponent: () => import('@not-found/pages/not-found-page/not-found-page'),
  },
];
