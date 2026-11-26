import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createSessionMiddleware, resolveSessionUser } from './session';
import type { DbClient } from './supabase';

interface FakeOptions {
  claims?: Record<string, unknown> | null;
  username?: string | null;
  /** Cookie que "refresca" `getClaims` (para comprobar que el 302 la conserva). */
  refreshCookie?: string;
}

/** Cliente falso: `getClaims` y `from('profiles').select().eq().maybeSingle()`. */
function fakeClient(options: FakeOptions, res?: express.Response): DbClient {
  return {
    auth: {
      getClaims: () => {
        if (options.refreshCookie) res?.append('Set-Cookie', options.refreshCookie);
        return Promise.resolve({ data: options.claims ? { claims: options.claims } : null });
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { username: options.username ?? null } }),
        }),
      }),
    }),
  } as unknown as DbClient;
}

describe('resolveSessionUser', () => {
  it('null sin claims', async () => {
    expect(await resolveSessionUser(fakeClient({ claims: null }))).toBeNull();
  });

  it('mapea claims y perfil', async () => {
    const user = await resolveSessionUser(
      fakeClient({
        claims: {
          sub: 'u1',
          user_metadata: { avatar_url: 'https://img.test/a.png' },
          app_metadata: { providers: ['email', 'google'] },
        },
        username: 'ANDER',
      }),
    );
    expect(user).toEqual({
      id: 'u1',
      name: 'ANDER',
      avatarUrl: 'https://img.test/a.png',
      hasPassword: true,
    });
  });

  it('PLAYER si falta el perfil, avatar solo https y sin identidad email', async () => {
    const user = await resolveSessionUser(
      fakeClient({
        claims: {
          sub: 'u2',
          user_metadata: { picture: 'http://img.test/a.png' },
          app_metadata: { providers: ['github'] },
        },
      }),
    );
    expect(user).toEqual({ id: 'u2', name: 'PLAYER', avatarUrl: null, hasPassword: false });
  });
});

describe('createSessionMiddleware', () => {
  let server: Server;
  let base: string;
  let options: FakeOptions;
  let configured = true;

  beforeAll(async () => {
    const app = express();
    app.use(createSessionMiddleware((_req, res) => (configured ? fakeClient(options, res) : null)));
    app.use((_req, res) => void res.json({ user: res.locals['user'] }));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    options = { claims: null };
    configured = true;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const get = (path: string) => fetch(`${base}${path}`, { redirect: 'manual' });

  it('/perfil sin sesión → 302 a /login conservando las cookies del refresco', async () => {
    options = { claims: null, refreshCookie: 'sb=1; Path=/' };
    const res = await get('/perfil');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login');
    expect(res.headers.get('set-cookie')).toContain('sb=1');
  });

  it('/perfil con sesión pasa y expone el usuario', async () => {
    options = { claims: { sub: 'u1' }, username: 'ANDER' };
    const res = await get('/perfil');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(((await res.json()) as { user: { name: string } }).user.name).toBe('ANDER');
  });

  it('ruta pública sin sesión pasa con user null', async () => {
    const res = await get('/juegos');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null });
  });

  it('no actúa sobre /api ni sobre estáticos', async () => {
    options = { claims: null };
    expect(await (await get('/api/x')).json()).toEqual({});
    expect(await (await get('/logo.svg')).json()).toEqual({});
  });

  it('sin configuración trata al jugador como invitado', async () => {
    configured = false;
    expect(await (await get('/')).json()).toEqual({ user: null });
    expect((await get('/perfil')).status).toBe(302);
  });
});
