import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'juegos/:id/jugar',
    loadComponent: () => import('@play/pages/play-page/play-page').then((m) => m.PlayPageComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('@not-found/pages/not-found-page/not-found-page').then((m) => m.NotFoundPageComponent),
  },
];
