import { Router } from 'express';
import type { SessionClientFactory } from './session';

/** Dependencias de las rutas de navegación de auth. */
export interface AuthNavigationDeps {
  /** Cliente con cookies: el verificador PKCE vive en la cookie del servidor. */
  sessionClient: SessionClientFactory;
  /** Origen público fijo (`SITE_URL`); nunca se deriva de `Origin`/`Host`. */
  siteUrl: string;
}

const PROVIDERS: readonly string[] = ['google', 'github'];

/**
 * Rutas de navegación de auth montadas en `/auth` (no son rutas de Angular): inicio de OAuth y
 * destino del callback (OAuth y enlace de confirmación). Paridad con `app/auth/callback` de Next.
 * Todo fallo termina en `/login?error=oauth`; la rama `?confirmed=1` cubre el enlace abierto en
 * otro navegador (sin verificador PKCE).
 */
export function createAuthNavigationRouter(deps: AuthNavigationDeps): Router {
  const router = Router();
  const failure = '/login?error=oauth';

  // GET /auth/oauth/:provider → 302 al proveedor (guarda el verificador PKCE en la cookie)
  router.get('/oauth/:provider', async (req, res) => {
    const provider = req.params['provider'];
    if (typeof provider !== 'string' || !PROVIDERS.includes(provider)) {
      return res.redirect(302, failure);
    }
    try {
      const supabase = deps.sessionClient(req, res);
      if (!supabase) return res.redirect(302, failure);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'google' | 'github',
        options: { redirectTo: `${deps.siteUrl}/auth/callback`, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        console.error('[auth] signInWithOAuth:', error?.message ?? 'sin URL');
        return res.redirect(302, failure);
      }
      res.redirect(302, data.url);
    } catch (error) {
      console.error('[auth] signInWithOAuth:', error);
      res.redirect(302, failure);
    }
  });

  // GET /auth/callback?code=… → canjea el código por sesión
  router.get('/callback', async (req, res) => {
    const code = req.query['code'];
    // Supabase manda ?error=… si el proveedor o el enlace fallan (p. ej. caducado).
    if (typeof code !== 'string' || !code || req.query['error']) {
      return res.redirect(302, failure);
    }
    try {
      const supabase = deps.sessionClient(req, res);
      if (!supabase) return res.redirect(302, failure);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[auth] exchangeCodeForSession:', error.message);
        // Sin verificador PKCE = el enlace se abrió en otro navegador: la cuenta ya está
        // confirmada, solo falta iniciar sesión. Por código/nombre del SDK, no por el texto.
        if (
          error.code === 'pkce_code_verifier_not_found' ||
          error.name === 'AuthPKCECodeVerifierMissingError'
        ) {
          return res.redirect(302, '/login?confirmed=1');
        }
        return res.redirect(302, failure);
      }
      res.redirect(302, '/');
    } catch (error) {
      console.error('[auth] exchangeCodeForSession:', error);
      res.redirect(302, failure);
    }
  });

  return router;
}
