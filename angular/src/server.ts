import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import { join } from 'node:path';
import { toGame } from '@/lib/games';
import type { Database } from '@/lib/supabase/database.types';

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

const GAME_ID = /^[a-z0-9-]{1,40}$/;

/**
 * GET /api/games/:id → `Game` (con `best`/`plays` de `game_stats`).
 * 404 si el id no es válido o no existe; 500 si falla la lectura. Solo lectura, clave
 * publicable y sin sesión (las policies RLS siguen protegiendo los datos).
 */
app.get('/api/games/:id', async (req, res) => {
  const id = req.params['id'];
  if (!GAME_ID.test(id)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) {
    res.status(500).json({ error: 'read_failed' });
    return;
  }
  try {
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [game, stats] = await Promise.all([
      supabase.from('games').select('*').eq('id', id).maybeSingle(),
      supabase.from('game_stats').select('*').eq('game_id', id).maybeSingle(),
    ]);
    if (game.error || stats.error) {
      res.status(500).json({ error: 'read_failed' });
      return;
    }
    if (!game.data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(toGame(game.data, stats.data ?? undefined));
  } catch {
    res.status(500).json({ error: 'read_failed' });
  }
});

// Cualquier otra ruta /api/* no existe (no debe caer en el handler de Angular).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

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

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
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
