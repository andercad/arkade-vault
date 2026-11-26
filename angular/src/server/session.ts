import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SessionUser } from '../app/shared/models/session';
import type { DbClient } from './supabase';

/** Rutas que exigen sesión (paridad con `PROTECTED_ROUTES` de `proxy.ts`). */
export const PROTECTED_ROUTES: readonly string[] = ['/perfil'];

/** Fábrica del cliente de sesión de una petición; `null` si falta la configuración. */
export type SessionClientFactory = (req: Request, res: Response) => DbClient | null;

/**
 * Refresca la sesión (`getClaims` valida/renueva el token y fija cookies) y devuelve el
 * jugador, o `null` sin sesión.
 */
export async function resolveSessionUser(supabase: DbClient): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', claims.sub)
    .maybeSingle();
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const photo = meta['avatar_url'] ?? meta['picture'];
  const providers = (claims.app_metadata as { providers?: unknown } | undefined)?.providers;
  return {
    id: claims.sub,
    name: profile?.username ?? 'PLAYER',
    avatarUrl: typeof photo === 'string' && /^https:\/\//.test(photo) ? photo : null,
    hasPassword: Array.isArray(providers) && providers.includes('email'),
  };
}

function isProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Estáticos (con extensión) y `/api/*` no pasan por el middleware de sesión. */
function skips(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/') || /\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Middleware de sesión: deja `res.locals['user']` y redirige (302) a `/login` las rutas
 * protegidas sin sesión, conservando las cookies del refresco. El resto es público.
 */
export function createSessionMiddleware(createClient: SessionClientFactory): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (skips(req.path)) return next();
    try {
      const supabase = createClient(req, res);
      const user = supabase ? await resolveSessionUser(supabase) : null;
      res.locals['user'] = user;
      if (user) res.setHeader('Cache-Control', 'private, no-store');
      if (!user && isProtected(req.path)) {
        res.redirect(302, '/login');
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
