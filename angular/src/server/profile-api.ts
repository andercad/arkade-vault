import { Router, type Request, type Response } from 'express';
import {
  PASSWORD_ERROR,
  USERNAME_ERROR,
  USERNAME_RE,
  validatePassword,
} from '@/lib/auth-validation';
import {
  CURRENT_PASSWORD_ERROR,
  GENERIC_ERROR,
  SAME_PASSWORD_ERROR,
  updatePasswordError,
  verifyPasswordError,
} from '@/lib/auth-errors';
import type { DbClient } from './supabase';

/** Dependencias del router de perfil; los clientes se inyectan para poder probarlo. */
export interface ProfileDeps {
  /** Cliente con la sesión de las cookies de la petición (clave publicable, RLS aplica). */
  sessionClient: (req: Request, res: Response) => DbClient | null;
  /** Clave secreta + IP del jugador: solo `auth.*` al verificar y cambiar la contraseña. */
  authClient: (req: Request, res: Response) => DbClient;
  /** Clave secreta sin sesión: solo `auth.admin.deleteUser`. */
  adminClient: () => DbClient;
}

const NO_SESSION = 'Inicia sesión para continuar.';
const USERNAME_TAKEN = 'Ese usuario ya existe.';
const USERNAME_FAILED = 'No se pudo cambiar el usuario. Inténtalo de nuevo.';
const RATE_LIMIT_STATUS = 'over_request_rate_limit';

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

/** Campo de texto del cuerpo JSON sin recortar; vacío si no es una cadena. */
function rawField(body: unknown, name: string): string {
  const value = (body as Record<string, unknown> | null | undefined)?.[name];
  return typeof value === 'string' ? value : '';
}

/**
 * Rutas `/api/profile/*`. El usuario sale SIEMPRE de `getUser()` (cookies), nunca del cuerpo.
 * - `PATCH /username { username }` → 200 `{ name }` | 400 | 401 | 409
 * - `POST /password { current, password, repeat }` → 204 | 400 | 401 | 429
 * - `DELETE / { confirm }` → 204 | 400 | 401
 */
export function createProfileRouter(deps: ProfileDeps): Router {
  const router = Router();

  /** Usuario de la sesión o responde 401 y devuelve `null`. */
  async function currentUser(req: Request, res: Response) {
    const supabase = deps.sessionClient(req, res);
    if (!supabase) {
      fail(res, 500, GENERIC_ERROR);
      return null;
    }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      fail(res, 401, NO_SESSION);
      return null;
    }
    return { supabase, user: data.user };
  }

  router.patch('/username', async (req, res) => {
    try {
      const ctx = await currentUser(req, res);
      if (!ctx) return;
      const name = rawField(req.body, 'username').trim();
      if (!USERNAME_RE.test(name)) return fail(res, 400, USERNAME_ERROR);

      const { data, error } = await ctx.supabase
        .from('profiles')
        .update({ username: name.toUpperCase() })
        .eq('id', ctx.user.id)
        .select('username')
        .maybeSingle();
      if (error) {
        // 23505: el índice único profiles_username_key rechaza el duplicado.
        if (error.code === '23505') return fail(res, 409, USERNAME_TAKEN);
        console.error('[perfil] Error al cambiar el usuario:', error);
        return fail(res, 500, USERNAME_FAILED);
      }
      if (!data) return fail(res, 500, USERNAME_FAILED);
      res.json({ name: data.username });
    } catch (error) {
      console.error('[perfil] Error al cambiar el usuario:', error);
      fail(res, 500, USERNAME_FAILED);
    }
  });

  router.post('/password', async (req, res) => {
    try {
      const ctx = await currentUser(req, res);
      if (!ctx) return;
      const { user } = ctx;

      // Solo las cuentas con identidad email tienen contraseña.
      const providers: unknown = user.app_metadata?.providers;
      const hasPassword = Array.isArray(providers) && providers.includes('email');
      if (!hasPassword || !user.email) return fail(res, 400, GENERIC_ERROR);

      const current = rawField(req.body, 'current');
      const password = rawField(req.body, 'password');
      const repeat = rawField(req.body, 'repeat');
      if (!current) return fail(res, 400, CURRENT_PASSWORD_ERROR);
      if (validatePassword(password)) return fail(res, 400, PASSWORD_ERROR);
      if (password !== repeat) return fail(res, 400, 'Las contraseñas no coinciden.');
      if (password === current) return fail(res, 400, SAME_PASSWORD_ERROR);

      const auth = deps.authClient(req, res).auth;

      // Verifica la actual (cuenta en el límite por IP) y deja una sesión nueva.
      const verify = await auth.signInWithPassword({ email: user.email, password: current });
      if (verify.error) {
        const known = verifyPasswordError(verify.error.code);
        if (known) return fail(res, verify.error.code === RATE_LIMIT_STATUS ? 429 : 401, known);
        console.error('[perfil] Error al verificar la contraseña:', verify.error);
        return fail(res, 500, GENERIC_ERROR);
      }

      const update = await auth.updateUser({ password });
      if (update.error) {
        const known = updatePasswordError(update.error.code);
        if (known) return fail(res, update.error.code === RATE_LIMIT_STATUS ? 429 : 400, known);
        console.error('[perfil] Error al cambiar la contraseña:', update.error);
        return fail(res, 500, GENERIC_ERROR);
      }

      // Cierra las sesiones de otros dispositivos; la actual sigue abierta.
      const out = await auth.signOut({ scope: 'others' });
      if (out.error) console.error('[perfil] Error al cerrar otras sesiones:', out.error);
      res.status(204).end();
    } catch (error) {
      console.error('[perfil] Error al cambiar la contraseña:', error);
      fail(res, 500, GENERIC_ERROR);
    }
  });

  router.delete('/', async (req, res) => {
    try {
      const ctx = await currentUser(req, res);
      if (!ctx) return;
      const confirm = rawField(req.body, 'confirm').trim().toUpperCase();

      const { data: profile, error } = await ctx.supabase
        .from('profiles')
        .select('username')
        .eq('id', ctx.user.id)
        .maybeSingle();
      if (error || !profile) {
        if (error) console.error('[perfil] Error al leer el perfil:', error);
        return fail(res, 500, GENERIC_ERROR);
      }
      if (!confirm || confirm !== profile.username) {
        return fail(res, 400, 'El usuario no coincide.');
      }

      // El cascade (0010, 0013) elimina su profiles y sus scores.
      const { error: deleteError } = await deps.adminClient().auth.admin.deleteUser(ctx.user.id);
      if (deleteError) {
        console.error('[perfil] Error al eliminar la cuenta:', deleteError);
        return fail(res, 500, GENERIC_ERROR);
      }

      // El usuario ya no existe: solo limpia las cookies de esta sesión.
      const out = await ctx.supabase.auth.signOut({ scope: 'local' });
      if (out.error) console.error('[perfil] Error al limpiar la sesión:', out.error);
      res.status(204).end();
    } catch (error) {
      console.error('[perfil] Error al eliminar la cuenta:', error);
      fail(res, 500, GENERIC_ERROR);
    }
  });

  return router;
}
