import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import type { Database } from '@/lib/supabase/database.types';

/** Configuración de Supabase; la inyecta `server.ts` (los módulos no leen `process.env`). */
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
  secretKey?: string;
  /** `Secure` en las cookies de sesión. */
  secureCookies: boolean;
}

/** Cliente tipado con el esquema de la BD. */
export type DbClient = SupabaseClient<Database>;

/**
 * IP del jugador solo de cabeceras que fija el proxy de confianza (SPEC 20): primero
 * `x-vercel-forwarded-for`, luego `x-real-ip` y, si no, la ÚLTIMA entrada de
 * `x-forwarded-for` (la primera la controla el cliente). Sin ninguna → `null`.
 */
export function clientIp(req: Pick<Request, 'headers'>): string | null {
  const one = (name: string): string | undefined => {
    const v = req.headers[name];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const forwarded = one('x-forwarded-for')?.split(',');
  return (
    one('x-vercel-forwarded-for') ||
    one('x-real-ip') ||
    forwarded?.[forwarded.length - 1]?.trim() ||
    null
  );
}

/** Métodos de cookies de `@supabase/ssr`: leen de `req` y escriben `Set-Cookie` en `res`. */
function cookieMethods(env: SupabaseEnv, req: Request, res: Response) {
  return {
    getAll: () => parseCookieHeader(req.headers.cookie ?? ''),
    setAll: (
      cookies: { name: string; value: string; options?: Record<string, unknown> }[],
      headers?: Record<string, string>,
    ) => {
      for (const { name, value, options } of cookies) {
        res.append(
          'Set-Cookie',
          serializeCookieHeader(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'lax',
            secure: env.secureCookies,
            path: '/',
          }),
        );
      }
      for (const [key, v] of Object.entries(headers ?? {})) res.setHeader(key, v);
    },
  };
}

/** Cliente con la clave publicable y la sesión de las cookies de la petición (RLS aplica). */
export function createSessionClient(env: SupabaseEnv, req: Request, res: Response): DbClient {
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: cookieMethods(env, req, res),
  }) as unknown as DbClient;
}

/**
 * Cliente con la clave secreta + `sb-forwarded-for` (IP del jugador) SOLO para `auth.*` en
 * sign-up/sign-in (SPEC 17). Salta RLS: nunca para `.from()`/`.rpc()` de datos.
 */
export function createAuthActionClient(env: SupabaseEnv, req: Request, res: Response): DbClient {
  if (!env.secretKey) throw new Error('Falta SUPABASE_SECRET_KEY en el entorno del servidor.');
  const ip = clientIp(req);
  return createServerClient<Database>(env.url, env.secretKey, {
    cookies: cookieMethods(env, req, res),
    global: ip ? { headers: { 'sb-forwarded-for': ip } } : undefined,
  }) as unknown as DbClient;
}

/**
 * Cliente con la clave secreta y sin sesión. Solo `email_for_username` y
 * `auth.admin.deleteUser`.
 */
export function createAdminClient(env: SupabaseEnv): DbClient {
  if (!env.secretKey) throw new Error('Falta SUPABASE_SECRET_KEY en el entorno del servidor.');
  return createClient<Database>(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
