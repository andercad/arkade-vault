import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAuthNavigationRouter } from './auth-navigation';
import type { DbClient } from './supabase';

type Err = { code?: string; name?: string; message: string } | null;

describe('createAuthNavigationRouter', () => {
  let server: Server;
  let base: string;
  let oauth: { data: { url: string | null }; error: Err };
  let exchange: { error: Err };
  let oauthArgs: unknown[];
  let exchangeCodes: string[];
  let sessionNull: boolean;
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const client = {
    auth: {
      signInWithOAuth: (arg: unknown) => {
        oauthArgs.push(arg);
        return Promise.resolve(oauth);
      },
      exchangeCodeForSession: (code: string) => {
        exchangeCodes.push(code);
        return Promise.resolve(exchange);
      },
    },
  } as unknown as DbClient;

  beforeAll(async () => {
    const app = express();
    app.use(
      '/auth',
      createAuthNavigationRouter({
        sessionClient: () => (sessionNull ? null : client),
        siteUrl: 'https://arcade.test',
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    oauth = { data: { url: 'https://accounts.google.test/auth?x=1' }, error: null };
    exchange = { error: null };
    oauthArgs = [];
    exchangeCodes = [];
    sessionNull = false;
    logged.mockClear();
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const get = async (path: string) => {
    const res = await fetch(`${base}${path}`, { redirect: 'manual' });
    return { status: res.status, location: res.headers.get('location') };
  };

  describe('GET /auth/oauth/:provider', () => {
    it.each(['google', 'github'])('%s → 302 al proveedor con redirectTo de SITE_URL', async (p) => {
      const res = await get(`/auth/oauth/${p}`);
      expect(res).toEqual({ status: 302, location: 'https://accounts.google.test/auth?x=1' });
      expect(oauthArgs).toEqual([
        {
          provider: p,
          options: { redirectTo: 'https://arcade.test/auth/callback', skipBrowserRedirect: true },
        },
      ]);
    });

    it('proveedor inválido → /login?error=oauth sin tocar Auth', async () => {
      expect(await get('/auth/oauth/xx')).toEqual({ status: 302, location: '/login?error=oauth' });
      expect(oauthArgs).toEqual([]);
    });

    it('error del SDK o sin URL → /login?error=oauth', async () => {
      oauth = { data: { url: null }, error: { message: 'x' } };
      expect((await get('/auth/oauth/google')).location).toBe('/login?error=oauth');
      oauth = { data: { url: null }, error: null };
      expect((await get('/auth/oauth/google')).location).toBe('/login?error=oauth');
    });

    it('sin configuración → /login?error=oauth', async () => {
      sessionNull = true;
      expect((await get('/auth/oauth/google')).location).toBe('/login?error=oauth');
    });
  });

  describe('GET /auth/callback', () => {
    it('sin code → /login?error=oauth sin canjear', async () => {
      expect(await get('/auth/callback')).toEqual({ status: 302, location: '/login?error=oauth' });
      expect(exchangeCodes).toEqual([]);
    });

    it('con ?error → /login?error=oauth aunque haya code', async () => {
      expect((await get('/auth/callback?code=abc&error=access_denied')).location).toBe(
        '/login?error=oauth',
      );
      expect(exchangeCodes).toEqual([]);
    });

    it('éxito → /', async () => {
      expect(await get('/auth/callback?code=abc')).toEqual({ status: 302, location: '/' });
      expect(exchangeCodes).toEqual(['abc']);
    });

    it('sin verificador PKCE (por error.code) → /login?confirmed=1', async () => {
      exchange = { error: { code: 'pkce_code_verifier_not_found', message: 'x' } };
      expect((await get('/auth/callback?code=abc')).location).toBe('/login?confirmed=1');
    });

    it('sin verificador PKCE (por error.name) → /login?confirmed=1', async () => {
      exchange = { error: { name: 'AuthPKCECodeVerifierMissingError', message: 'x' } };
      expect((await get('/auth/callback?code=abc')).location).toBe('/login?confirmed=1');
    });

    it('otro fallo → /login?error=oauth y se registra', async () => {
      exchange = { error: { code: 'flow_state_expired', message: 'x' } };
      expect((await get('/auth/callback?code=abc')).location).toBe('/login?error=oauth');
      expect(logged).toHaveBeenCalled();
    });

    it('sin configuración → /login?error=oauth', async () => {
      sessionNull = true;
      expect((await get('/auth/callback?code=abc')).location).toBe('/login?error=oauth');
    });
  });
});
