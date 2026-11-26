import { Routes } from '@angular/router';

/** Rutas bajo `/juegos`: biblioteca y detalle de un juego (`/juegos/:id/jugar` es de `play`). */
export const LIBRARY_ROUTES: Routes = [
  {
    path: '',
    title: 'Arcade Vault',
    loadComponent: () => import('@library/pages/library-page/library-page'),
  },
  {
    path: ':id',
    title: 'Arcade Vault',
    loadComponent: () => import('@library/pages/game-detail-page/game-detail-page'),
  },
];
