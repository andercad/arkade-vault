import { Router, type Request, type Response } from 'express';
import { resolveSessionUser } from './session';
import type { DbClient } from './supabase';

/** Dependencias del router de auth; los clientes se inyectan para poder probarlo. */
export interface AuthDeps {
  /** Cliente con la sesión de las cookies de la petición (clave publicable). */
  sessionClient: (req: Request, res: Response) => DbClient | null;
}

/** Rutas `/api/auth/*` del BFF. La sesión vive en cookies `httpOnly`, nunca en el navegador. */
export function createAuthRouter(deps: AuthDeps): Router {
  const router = Router();

  // GET /api/auth/me → { user: SessionUser | null }
  router.get('/me', async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      const supabase = deps.sessionClient(req, res);
      res.json({ user: supabase ? await resolveSessionUser(supabase) : null });
    } catch {
      res.status(500).json({ error: 'read_failed' });
    }
  });

  return router;
}
