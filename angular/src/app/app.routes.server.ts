import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Canvas, sin SEO y sin tocar `window` en el servidor: se renderiza en el cliente.
  { path: 'juegos/:id/jugar', renderMode: RenderMode.Client },
  // Resto de rutas: servidor, con 404 real para las desconocidas.
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
