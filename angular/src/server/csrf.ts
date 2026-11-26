import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa CSRF para `/api/*` con cookies `SameSite=Lax`: las peticiones que cambian estado
 * deben llevar `Origin` igual a `siteUrl` (403) y `Content-Type: application/json` (415).
 */
export function createCsrfMiddleware(siteUrl: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.headers.origin !== siteUrl) {
      res.status(403).json({ error: 'forbidden_origin' });
      return;
    }
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'unsupported_media_type' });
      return;
    }
    next();
  };
}
