import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { createClient } from '@supabase/supabase-js';
import express, { type Request, type Response } from 'express';
import { join } from 'node:path';
import type { Database } from '@/lib/supabase/database.types';
import { createApiRouter, type ApiClient } from './server/api';
import { createAuthRouter } from './server/auth-api';
import { createAuthNavigationRouter } from './server/auth-navigation';
import { createCsrfMiddleware } from './server/csrf';
import { createScoresRouter } from './server/scores-api';
import { createSessionMiddleware } from './server/session';
import {
  createAdminClient,
  createAuthActionClient,
  createSessionClient,
  type DbClient,
  type SupabaseEnv,
} from './server/supabase';

// Variables de angular/.env (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY). Opcional: en
// producción llegan del entorno del proceso.
try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usan las variables del entorno.
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');

// Mismas cabeceras de seguridad que next.config.ts (SPEC 17).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const isProduction = process.env['NODE_ENV'] === 'production';

// SITE_URL (SPEC 20/26): origen público sin "/" final; fija redirecciones y el Origin
// permitido. Obligatoria en producción; en desarrollo, el puerto de `ng serve`.
const siteUrl = (process.env['SITE_URL'] ?? (isProduction ? '' : 'http://localhost:4200')).replace(
  /\/+$/,
  '',
);
if (!siteUrl) throw new Error('Falta SITE_URL en el entorno (obligatoria en producción).');

/** Configuración de Supabase para sesión y auth; `null` si faltan las variables. */
function supabaseEnv(): SupabaseEnv | null {
  const url = process.env['SUPABASE_URL'];
  const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !publishableKey) return null;
  return {
    url,
    publishableKey,
    secretKey: process.env['SUPABASE_SECRET_KEY'],
    secureCookies: isProduction,
  };
}

/** Configuración obligatoria para las rutas de auth (lanza si falta). */
function requireSupabaseEnv(): SupabaseEnv {
  const env = supabaseEnv();
  if (!env) throw new Error('Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en el entorno.');
  return env;
}

/** Cliente de sesión de la petición (cookies); `null` sin configuración. */
function sessionClient(req: Request, res: Response): DbClient | null {
  const env = supabaseEnv();
  return env ? createSessionClient(env, req, res) : null;
}

/** Cliente Supabase de solo lectura; `null` si faltan las variables de entorno. */
function createReadClient(): ApiClient | null {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Las mutaciones de /api/* exigen Origin == SITE_URL y JSON (CSRF).
app.use('/api', createCsrfMiddleware(siteUrl));

// Auth (SPEC 26): sesión en cookies httpOnly.
app.use('/api/auth', express.json(), createAuthRouter({
    sessionClient,
    authClient: (req, res) => createAuthActionClient(requireSupabaseEnv(), req, res),
    adminClient: () => createAdminClient(requireSupabaseEnv()),
    siteUrl,
  }));

// Guardado de puntuación (SPEC 26): exige sesión; player_name lo pone el servidor.
app.use('/api/scores', express.json(), createScoresRouter({ sessionClient }));

// BFF de solo lectura (src/server/api.ts); responde 404 JSON a cualquier otra /api/*.
app.use('/api', createApiRouter(createReadClient));

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// Rutas Express de navegación de auth (OAuth y callback); el resto de /auth/* es de Angular.
app.use('/auth', createAuthNavigationRouter({ sessionClient, siteUrl }));

// Sesión: refresca cookies, deja res.locals.user y protege /perfil (302 a /login).
app.use(createSessionMiddleware(sessionClient));

/**
 * Handle all other requests by rendering the Angular application. El jugador resuelto va
 * en `REQUEST_CONTEXT` (lo lee `SessionService`).
 */
app.use((req, res, next) => {
  angularApp
    .handle(req, { user: res.locals['user'] ?? null })
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
