import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAuthRouter } from './auth-api';
import type { DbClient } from './supabase';

type Err = { code?: string } | null;

/** Estado configurable de los clientes falsos y registro de las llamadas. */
interface Fakes {
  claims: Record<string, unknown> | null;
  claimsFails: boolean;
  profileTaken: boolean;
  lookupError: boolean;
  signUp: { data: unknown; error: Err };
  signIn: { error: Err };
  emailFor: { data: string | null; error: unknown };
  signOutCalled: number;
  authCalls: { signUp: unknown[]; signIn: unknown[] };
  rpcCalls: unknown[];
  authClientUsed: number;
  sessionNull: boolean;
  reset: { error: Err };
  exchange: { error: Err };
  update: { error: Err };
  calls: { reset: unknown[]; exchange: unknown[]; update: unknown[] };
}

const fresh = (): Fakes => ({
  claims: null,
  claimsFails: false,
  profileTaken: false,
  lookupError: false,
  signUp: { data: { user: { identities: [{}] }, session: null }, error: null },
  signIn: { error: null },
  emailFor: { data: 'ana@vault.gg', error: null },
  signOutCalled: 0,
  authCalls: { signUp: [], signIn: [] },
  rpcCalls: [],
  authClientUsed: 0,
  sessionNull: false,
  reset: { error: null },
  exchange: { error: null },
  update: { error: null },
  calls: { reset: [], exchange: [], update: [] },
});

describe('createAuthRouter', () => {
  let server: Server;
  let base: string;
  let f: Fakes;
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const sessionClient = {
    auth: {
      getClaims: () =>
        f.claimsFails
          ? Promise.reject(new Error('boom'))
          : Promise.resolve({ data: f.claims ? { claims: f.claims } : null }),
      signOut: () => {
        f.signOutCalled++;
        return Promise.resolve({ error: null });
      },
      resetPasswordForEmail: (...args: unknown[]) => {
        f.calls.reset.push(args);
        return Promise.resolve(f.reset);
      },
      exchangeCodeForSession: (code: string) => {
        f.calls.exchange.push(code);
        return Promise.resolve(f.exchange);
      },
      updateUser: (arg: unknown) => {
        f.calls.update.push(arg);
        return Promise.resolve(f.update);
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve(
              f.lookupError
                ? { data: null, error: { message: 'x' } }
                : { data: f.profileTaken ? { id: 'x', username: 'ANDER' } : null, error: null },
            ),
        }),
      }),
    }),
  } as unknown as DbClient;

  const authClient = {
    auth: {
      signUp: (arg: unknown) => {
        f.authCalls.signUp.push(arg);
        return Promise.resolve(f.signUp);
      },
      signInWithPassword: (arg: unknown) => {
        f.authCalls.signIn.push(arg);
        return Promise.resolve(f.signIn);
      },
    },
  } as unknown as DbClient;

  const adminClient = {
    rpc: (name: string, args: unknown) => {
      f.rpcCalls.push([name, args]);
      return Promise.resolve(f.emailFor);
    },
  } as unknown as DbClient;

  beforeAll(async () => {
    const app = express();
    app.use(
      '/api/auth',
      express.json(),
      createAuthRouter({
        sessionClient: () => (f.sessionNull ? null : sessionClient),
        authClient: () => {
          f.authClientUsed++;
          return authClient;
        },
        adminClient: () => adminClient,
        siteUrl: 'https://arcade.test',
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    f = fresh();
    logged.mockClear();
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const post = (path: string, body: unknown) =>
    fetch(`${base}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

  describe('GET /me', () => {
    it('sin sesión → { user: null } y no-store', async () => {
      const res = await fetch(`${base}/api/auth/me`);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('private, no-store');
      expect(await json(res)).toEqual({ user: null });
    });

    it('con sesión → el usuario', async () => {
      f.claims = { sub: 'u1', app_metadata: { providers: ['email'] } };
      f.profileTaken = true;
      const body = (await json(await fetch(`${base}/api/auth/me`))) as {
        user: { id: string; name: string; hasPassword: boolean };
      };
      expect(body.user).toMatchObject({ id: 'u1', name: 'ANDER', hasPassword: true });
    });

    it('sin configuración → { user: null }', async () => {
      f.sessionNull = true;
      expect(await json(await fetch(`${base}/api/auth/me`))).toEqual({ user: null });
    });

    it('fallo de lectura → 500', async () => {
      f.claimsFails = true;
      expect((await fetch(`${base}/api/auth/me`)).status).toBe(500);
    });
  });

  describe('POST /sign-up', () => {
    const valid = { username: 'px_kai', email: 'kai@vault.gg', password: 'Aa1!aaaa' };

    it('entrada inválida → 400 sin tocar Auth', async () => {
      const res = await post('sign-up', { ...valid, password: 'x' });
      expect(res.status).toBe(400);
      expect(f.authClientUsed).toBe(0);
    });

    it('cuerpo sin objeto → 400', async () => {
      expect((await post('sign-up', null)).status).toBe(400);
    });

    it('usuario ocupado → 409', async () => {
      f.profileTaken = true;
      const res = await post('sign-up', valid);
      expect(res.status).toBe(409);
      expect(await json(res)).toEqual({ error: 'Ese usuario ya existe.' });
      expect(f.authClientUsed).toBe(0);
    });

    it('error al comprobar el usuario → 500 genérico', async () => {
      f.lookupError = true;
      expect((await post('sign-up', valid)).status).toBe(500);
    });

    it('éxito sin sesión → 201 needsConfirmation con SITE_URL y username en metadata', async () => {
      const res = await post('sign-up', valid);
      expect(res.status).toBe(201);
      expect(await json(res)).toEqual({ needsConfirmation: true, email: 'kai@vault.gg' });
      expect(f.authCalls.signUp[0]).toEqual({
        email: 'kai@vault.gg',
        password: 'Aa1!aaaa',
        options: {
          data: { username: 'px_kai' },
          emailRedirectTo: 'https://arcade.test/auth/callback',
        },
      });
    });

    it('éxito con sesión → needsConfirmation false', async () => {
      f.signUp = { data: { user: { identities: [{}] }, session: {} }, error: null };
      expect(await json(await post('sign-up', valid))).toMatchObject({ needsConfirmation: false });
    });

    it.each([
      ['user_already_exists', 409, 'Ese correo ya está registrado.'],
      ['email_exists', 409, 'Ese correo ya está registrado.'],
      [
        'over_request_rate_limit',
        429,
        'Demasiados intentos. Espera unos minutos y vuelve a probar.',
      ],
      ['over_email_send_rate_limit', 429, 'Demasiados correos enviados. Inténtalo más tarde.'],
    ])('error %s → %i (mapeado por código)', async (code, status, message) => {
      f.signUp = { data: {}, error: { code } };
      const res = await post('sign-up', valid);
      expect(res.status).toBe(status);
      expect(await json(res)).toEqual({ error: message });
    });

    it('weak_password → 400 con el mensaje de contraseña', async () => {
      f.signUp = { data: {}, error: { code: 'weak_password' } };
      const res = await post('sign-up', valid);
      expect(res.status).toBe(400);
      expect(((await json(res)) as { error: string }).error).toContain('al menos 8 caracteres');
    });

    it('correo ya registrado sin error (identities vacías) → 409', async () => {
      f.signUp = { data: { user: { identities: [] }, session: null }, error: null };
      expect((await post('sign-up', valid)).status).toBe(409);
    });

    it('error desconocido → 500 genérico y se registra', async () => {
      f.signUp = { data: {}, error: { code: 'otra_cosa' } };
      const res = await post('sign-up', valid);
      expect(res.status).toBe(500);
      expect(((await json(res)) as { error: string }).error).toContain('No se pudo completar');
      expect(logged).toHaveBeenCalled();
    });
  });

  describe('POST /sign-in', () => {
    it('entrada inválida → 400', async () => {
      expect((await post('sign-in', { identifier: '', password: 'x' })).status).toBe(400);
      expect((await post('sign-in', { identifier: 'ana@vault.gg', password: '' })).status).toBe(
        400,
      );
    });

    it('por email: no resuelve el usuario y entra → 204', async () => {
      const res = await post('sign-in', { identifier: 'ana@vault.gg', password: 'x' });
      expect(res.status).toBe(204);
      expect(f.rpcCalls).toEqual([]);
      expect(f.authCalls.signIn[0]).toEqual({ email: 'ana@vault.gg', password: 'x' });
    });

    it('por usuario: resuelve el email con email_for_username', async () => {
      const res = await post('sign-in', { identifier: 'ana_x', password: 'x' });
      expect(res.status).toBe(204);
      expect(f.rpcCalls).toEqual([['email_for_username', { p_username: 'ana_x' }]]);
      expect(f.authCalls.signIn[0]).toEqual({ email: 'ana@vault.gg', password: 'x' });
    });

    it('usuario inexistente y contraseña incorrecta dan el MISMO mensaje', async () => {
      f.emailFor = { data: null, error: null };
      const unknownUser = await post('sign-in', { identifier: 'nadie', password: 'x' });

      f = fresh();
      f.signIn = { error: { code: 'invalid_credentials' } };
      const badPassword = await post('sign-in', { identifier: 'ana_x', password: 'x' });

      expect(unknownUser.status).toBe(401);
      expect(badPassword.status).toBe(401);
      expect(await json(unknownUser)).toEqual(await json(badPassword));
      expect(await json(await post('sign-in', { identifier: 'ana_x', password: 'x' }))).toEqual({
        error: 'Usuario o contraseña incorrectos.',
      });
    });

    it('email no confirmado → 401 con su mensaje', async () => {
      f.signIn = { error: { code: 'email_not_confirmed' } };
      const res = await post('sign-in', { identifier: 'ana@vault.gg', password: 'x' });
      expect(res.status).toBe(401);
      expect(await json(res)).toEqual({ error: 'Confirma tu email antes de entrar.' });
    });

    it('límite de intentos → 429', async () => {
      f.signIn = { error: { code: 'over_request_rate_limit' } };
      expect((await post('sign-in', { identifier: 'ana@vault.gg', password: 'x' })).status).toBe(
        429,
      );
    });

    it('error desconocido → 500 genérico y se registra', async () => {
      f.signIn = { error: { code: 'otra_cosa' } };
      expect((await post('sign-in', { identifier: 'ana@vault.gg', password: 'x' })).status).toBe(
        500,
      );
      expect(logged).toHaveBeenCalled();
    });

    it('fallo al resolver el usuario → 500 genérico', async () => {
      f.emailFor = { data: null, error: new Error('rpc') };
      expect((await post('sign-in', { identifier: 'ana_x', password: 'x' })).status).toBe(500);
    });
  });

  describe('POST /sign-out', () => {
    it('cierra la sesión → 204', async () => {
      const res = await post('sign-out', {});
      expect(res.status).toBe(204);
      expect(f.signOutCalled).toBe(1);
    });

    it('sin configuración también responde 204', async () => {
      f.sessionNull = true;
      expect((await post('sign-out', {})).status).toBe(204);
    });
  });

  describe('POST /forgot-password', () => {
    it.each(['', 'no-es-correo'])('correo inválido %j → 400 sin tocar Auth', async (email) => {
      const res = await post('forgot-password', { email });
      expect(res.status).toBe(400);
      expect(f.calls.reset).toEqual([]);
    });

    it('correo válido → 204 con redirectTo de SITE_URL (nunca del Origin)', async () => {
      const res = await post('forgot-password', { email: '  kai@vault.gg ' });
      expect(res.status).toBe(204);
      expect(f.calls.reset).toEqual([
        ['kai@vault.gg', { redirectTo: 'https://arcade.test/auth/reset-password' }],
      ]);
    });

    it.each([
      ['over_email_send_rate_limit', 'Demasiados correos enviados. Inténtalo más tarde.'],
      ['over_request_rate_limit', 'Demasiados intentos. Espera unos minutos y vuelve a probar.'],
    ])('%s → 429', async (code, message) => {
      f.reset = { error: { code } };
      const res = await post('forgot-password', { email: 'kai@vault.gg' });
      expect(res.status).toBe(429);
      expect(await json(res)).toEqual({ error: message });
    });

    it('error desconocido → 500 y se registra', async () => {
      f.reset = { error: { code: 'otra_cosa' } };
      expect((await post('forgot-password', { email: 'kai@vault.gg' })).status).toBe(500);
      expect(logged).toHaveBeenCalled();
    });

    it('sin configuración → 500 genérico', async () => {
      f.sessionNull = true;
      expect((await post('forgot-password', { email: 'kai@vault.gg' })).status).toBe(500);
    });
  });

  describe('POST /recovery', () => {
    const valid = { code: 'abc', password: 'Aa1!aaaa' };

    it('sin código → 400 y no toca Auth', async () => {
      const res = await post('recovery', { ...valid, code: '' });
      expect(res.status).toBe(400);
      expect(f.calls.exchange).toEqual([]);
    });

    it('contraseña débil → 400 sin consumir el código', async () => {
      const res = await post('recovery', { ...valid, password: 'x' });
      expect(res.status).toBe(400);
      expect(f.calls.exchange).toEqual([]);
    });

    it('canjea el código y fija la contraseña → 204', async () => {
      const res = await post('recovery', valid);
      expect(res.status).toBe(204);
      expect(f.calls.exchange).toEqual(['abc']);
      expect(f.calls.update).toEqual([{ password: 'Aa1!aaaa' }]);
    });

    it('código inválido, caducado o usado → 400 y no cambia la contraseña', async () => {
      f.exchange = { error: { code: 'flow_state_not_found' } };
      const res = await post('recovery', valid);
      expect(res.status).toBe(400);
      expect(((await json(res)) as { error: string }).error).toContain('no es válido');
      expect(f.calls.update).toEqual([]);
    });

    it('same_password → 400 con su mensaje', async () => {
      f.update = { error: { code: 'same_password' } };
      const res = await post('recovery', valid);
      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: 'La nueva contraseña debe ser distinta de la anterior.',
      });
    });

    it('weak_password del servidor → 400 con el mensaje de contraseña', async () => {
      f.update = { error: { code: 'weak_password' } };
      const res = await post('recovery', valid);
      expect(res.status).toBe(400);
      expect(((await json(res)) as { error: string }).error).toContain('al menos 8 caracteres');
    });

    it('límite de intentos → 429', async () => {
      f.update = { error: { code: 'over_request_rate_limit' } };
      expect((await post('recovery', valid)).status).toBe(429);
    });

    it('error desconocido → 500 genérico', async () => {
      f.update = { error: { code: 'otra_cosa' } };
      expect((await post('recovery', valid)).status).toBe(500);
      expect(logged).toHaveBeenCalled();
    });

    it('sin configuración → 500 genérico', async () => {
      f.sessionNull = true;
      expect((await post('recovery', valid)).status).toBe(500);
    });
  });
});
