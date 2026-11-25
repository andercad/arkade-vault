import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'juegos/:id/jugar',
    loadComponent: () => import('./play/play-page').then((m) => m.PlayPageComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
