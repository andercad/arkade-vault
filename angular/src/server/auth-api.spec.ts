import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAuthRouter } from './auth-api';
import type { DbClient } from './supabase';

describe('createAuthRouter · GET /me', () => {
  let server: Server;
  let base: string;
  let client: DbClient | null;
  let fail = false;

  const fake = (claims: Record<string, unknown> | null): DbClient =>
    ({
      auth: {
        getClaims: () => {
          if (fail) return Promise.reject(new Error('boom'));
          return Promise.resolve({ data: claims ? { claims } : null });
        },
      },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: { username: 'ANDER' } }) }),
        }),
      }),
    }) as unknown as DbClient;

  beforeAll(async () => {
    const app = express();
    app.use('/api/auth', createAuthRouter({ sessionClient: () => client }));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    fail = false;
    client = fake(null);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('sin sesión → { user: null } y no-store', async () => {
    const res = await fetch(`${base}/api/auth/me`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({ user: null });
  });

  it('con sesión → el usuario', async () => {
    client = fake({ sub: 'u1', app_metadata: { providers: ['email'] } });
    const body = (await (await fetch(`${base}/api/auth/me`)).json()) as {
      user: { id: string; name: string; hasPassword: boolean };
    };
    expect(body.user).toMatchObject({ id: 'u1', name: 'ANDER', hasPassword: true });
  });

  it('sin configuración → { user: null }', async () => {
    client = null;
    expect(await (await fetch(`${base}/api/auth/me`)).json()).toEqual({ user: null });
  });

  it('fallo de lectura → 500', async () => {
    fail = true;
    expect((await fetch(`${base}/api/auth/me`)).status).toBe(500);
  });
});
