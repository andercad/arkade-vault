import { Router, type Request, type Response } from 'express';
import { validateSignIn, validateSignUp } from '@/lib/auth-validation';
import { GENERIC_ERROR, INVALID_CREDENTIALS, signInError, signUpError } from '@/lib/auth-errors';
import { resolveSessionUser } from './session';
import type { DbClient } from './supabase';

/** Dependencias del router de auth; los clientes se inyectan para poder probarlo. */
export interface AuthDeps {
  /** Cliente con la sesión de las cookies de la petición (clave publicable). */
  sessionClient: (req: Request, res: Response) => DbClient | null;
  /** Clave secreta + IP del jugador: SOLO para `auth.*` de sign-up/sign-in (SPEC 17). */
  authClient: (req: Request, res: Response) => DbClient;
  /** Clave secreta sin sesión: solo `email_for_username`. */
  adminClient: () => DbClient;
  /** Origen público fijo (`SITE_URL`); nunca se deriva de `Origin`/`Host`. */
  siteUrl: string;
}

/** Código HTTP de cada error de Auth conocido. */
const STATUS_BY_CODE: Record<string, number> = {
  user_already_exists: 409,
  email_exists: 409,
  weak_password: 400,
  over_request_rate_limit: 429,
  over_email_send_rate_limit: 429,
  email_not_confirmed: 401,
  invalid_credentials: 401,
};

/** Campo de texto del cuerpo JSON; vacío si no es una cadena. */
export function textField(body: unknown, name: string): string {
  const value = (body as Record<string, unknown> | null | undefined)?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

/** Responde con el mensaje conocido de un error de Auth, o registra y da el genérico. */
function authFailure(
  res: Response,
  label: string,
  error: { code?: string },
  message: string | null,
): void {
  if (message) return fail(res, STATUS_BY_CODE[error.code ?? ''] ?? 400, message);
  console.error(`[auth] Error en ${label}:`, error);
  fail(res, 500, GENERIC_ERROR);
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
      fail(res, 500, 'read_failed');
    }
  });

  // POST /api/auth/sign-up { username, email, password } → 201 { needsConfirmation, email }
  router.post('/sign-up', async (req, res) => {
    const username = textField(req.body, 'username');
    const email = textField(req.body, 'email');
    const rawPassword = (req.body as Record<string, unknown> | undefined)?.['password'];
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    const invalid = validateSignUp({ username, email, password });
    if (invalid) return fail(res, 400, invalid);

    try {
      // `profiles` es de lectura pública: comprueba que el usuario esté libre.
      const supabase = deps.sessionClient(req, res);
      if (!supabase) return fail(res, 500, GENERIC_ERROR);
      const { data: taken, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toUpperCase())
        .maybeSingle();
      if (lookupError) {
        console.error('[auth] Error al comprobar el usuario:', lookupError);
        return fail(res, 500, GENERIC_ERROR);
      }
      if (taken) return fail(res, 409, 'Ese usuario ya existe.');

      const { data, error } = await deps.authClient(req, res).auth.signUp({
        email,
        password,
        options: { data: { username }, emailRedirectTo: `${deps.siteUrl}/auth/callback` },
      });
      if (error) return authFailure(res, 'signUp', error, signUpError(error.code));

      // Con confirmación activa, un correo ya registrado no da error: devuelve un usuario
      // sin identidades.
      if (data.user && data.user.identities?.length === 0) {
        return fail(res, 409, 'Ese correo ya está registrado.');
      }
      res.status(201).json({ needsConfirmation: !data.session, email });
    } catch (error) {
      console.error('[auth] Error en signUp:', error);
      fail(res, 500, GENERIC_ERROR);
    }
  });

  // POST /api/auth/sign-in { identifier, password } → 204
  router.post('/sign-in', async (req, res) => {
    const identifier = textField(req.body, 'identifier');
    const rawPassword = (req.body as Record<string, unknown> | undefined)?.['password'];
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    const invalid = validateSignIn({ identifier, password });
    if (invalid) return fail(res, 400, invalid);

    try {
      let email = identifier;
      if (!identifier.includes('@')) {
        const { data, error } = await deps
          .adminClient()
          .rpc('email_for_username', { p_username: identifier });
        if (error) throw error;
        // Usuario inexistente: mismo mensaje que contraseña mala (no enumerar).
        if (!data) return fail(res, 401, INVALID_CREDENTIALS);
        email = data;
      }

      const { error } = await deps
        .authClient(req, res)
        .auth.signInWithPassword({ email, password });
      if (error) return authFailure(res, 'signIn', error, signInError(error.code));
      res.status(204).end();
    } catch (error) {
      console.error('[auth] Error en signIn:', error);
      fail(res, 500, GENERIC_ERROR);
    }
  });

  // POST /api/auth/sign-out → 204 (borra las cookies de sesión)
  router.post('/sign-out', async (req, res) => {
    try {
      await deps.sessionClient(req, res)?.auth.signOut();
      res.status(204).end();
    } catch (error) {
      console.error('[auth] Error en signOut:', error);
      fail(res, 500, GENERIC_ERROR);
    }
  });

  return router;
}
