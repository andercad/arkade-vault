import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Canvas, sin SEO y sin tocar `window` en el servidor: se renderiza en el cliente.
  { path: 'juegos/:id/jugar', renderMode: RenderMode.Client },
  // Acceso: formulario sin datos ni SEO, en el cliente.
  { path: 'login', renderMode: RenderMode.Client },
  // Sin datos: se genera en el build.
  { path: 'about', renderMode: RenderMode.Prerender },
  // Con datos del BFF: servidor.
  { path: '', renderMode: RenderMode.Server },
  { path: 'juegos', renderMode: RenderMode.Server },
  { path: 'juegos/:id', renderMode: RenderMode.Server },
  { path: 'salon-de-la-fama', renderMode: RenderMode.Server },
  // Resto de rutas: servidor, con 404 real para las desconocidas.
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
