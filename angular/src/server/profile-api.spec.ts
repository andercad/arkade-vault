import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createProfileRouter } from './profile-api';
import type { DbClient } from './supabase';

type Err = { code?: string; message?: string } | null;

interface Fakes {
  user: { id: string; email?: string; app_metadata?: { providers?: string[] } } | null;
  update: { data: { username: string } | null; error: Err };
  select: { data: { username: string } | null; error: Err };
  verify: { error: Err };
  updateUser: { error: Err };
  signOutOthers: { error: Err };
  deleteUser: { error: Err };
  calls: {
    update: unknown[];
    eq: unknown[];
    verify: unknown[];
    updateUser: unknown[];
    signOut: unknown[];
    deleted: string[];
  };
  authClientUsed: number;
  sessionNull: boolean;
}

const fresh = (): Fakes => ({
  user: { id: 'u1', email: 'ana@vault.gg', app_metadata: { providers: ['email'] } },
  update: { data: { username: 'NUEVO' }, error: null },
  select: { data: { username: 'ANA' }, error: null },
  verify: { error: null },
  updateUser: { error: null },
  signOutOthers: { error: null },
  deleteUser: { error: null },
  calls: { update: [], eq: [], verify: [], updateUser: [], signOut: [], deleted: [] },
  authClientUsed: 0,
  sessionNull: false,
});

describe('createProfileRouter', () => {
  let server: Server;
  let base: string;
  let f: Fakes;
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const sessionClient = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: f.user } }),
      signOut: (arg: unknown) => {
        f.calls.signOut.push(['session', arg]);
        return Promise.resolve({ error: null });
      },
    },
    from: () => ({
      update: (row: unknown) => {
        f.calls.update.push(row);
        return {
          eq: (col: string, id: string) => {
            f.calls.eq.push([col, id]);
            return { select: () => ({ maybeSingle: () => Promise.resolve(f.update) }) };
          },
        };
      },
      select: () => ({
        eq: (col: string, id: string) => {
          f.calls.eq.push([col, id]);
          return { maybeSingle: () => Promise.resolve(f.select) };
        },
      }),
    }),
  } as unknown as DbClient;

  const authClient = {
    auth: {
      signInWithPassword: (arg: unknown) => {
        f.calls.verify.push(arg);
        return Promise.resolve(f.verify);
      },
      updateUser: (arg: unknown) => {
        f.calls.updateUser.push(arg);
        return Promise.resolve(f.updateUser);
      },
      signOut: (arg: unknown) => {
        f.calls.signOut.push(['auth', arg]);
        return Promise.resolve(f.signOutOthers);
      },
    },
  } as unknown as DbClient;

  const adminClient = {
    auth: {
      admin: {
        deleteUser: (id: string) => {
          f.calls.deleted.push(id);
          return Promise.resolve(f.deleteUser);
        },
      },
    },
  } as unknown as DbClient;

  beforeAll(async () => {
    const app = express();
    app.use(
      '/api/profile',
      express.json(),
      createProfileRouter({
        sessionClient: () => (f.sessionNull ? null : sessionClient),
        authClient: () => {
          f.authClientUsed++;
          return authClient;
        },
        adminClient: () => adminClient,
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

  const call = (method: string, path: string, body: unknown) =>
    fetch(`${base}/api/profile${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

  describe('PATCH /username', () => {
    it('sin sesión → 401', async () => {
      f.user = null;
      expect((await call('PATCH', '/username', { username: 'Nuevo' })).status).toBe(401);
      expect(f.calls.update).toEqual([]);
    });

    it('cambia el usuario en mayúsculas, con el id de la sesión y no del cuerpo', async () => {
      const res = await call('PATCH', '/username', {
        username: ' nuevo ',
        id: 'otro',
        userId: 'x',
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ name: 'NUEVO' });
      expect(f.calls.update).toEqual([{ username: 'NUEVO' }]);
      expect(f.calls.eq).toEqual([['id', 'u1']]);
    });

    it.each([[''], ['ab'], ['demasiadolargo'], ['con espacio'], ['ñandú']])(
      'usuario inválido %j → 400',
      async (username) => {
        const res = await call('PATCH', '/username', { username });
        expect(res.status).toBe(400);
        expect(f.calls.update).toEqual([]);
      },
    );

    it('duplicado (23505) → 409 "Ese usuario ya existe."', async () => {
      f.update = { data: null, error: { code: '23505' } };
      const res = await call('PATCH', '/username', { username: 'Nuevo' });
      expect(res.status).toBe(409);
      expect(await errorOf(res)).toBe('Ese usuario ya existe.');
    });

    it('otro error o sin fila → 500', async () => {
      f.update = { data: null, error: { code: 'XX' } };
      expect((await call('PATCH', '/username', { username: 'Nuevo' })).status).toBe(500);
      f.update = { data: null, error: null };
      expect((await call('PATCH', '/username', { username: 'Nuevo' })).status).toBe(500);
    });
  });

  describe('POST /password', () => {
    const body = { current: 'Actual1!x', password: 'Nueva2@yz', repeat: 'Nueva2@yz' };

    it('sin sesión → 401', async () => {
      f.user = null;
      expect((await call('POST', '/password', body)).status).toBe(401);
      expect(f.authClientUsed).toBe(0);
    });

    it('cuenta sin identidad email (OAuth) → 400 sin tocar auth', async () => {
      f.user = { id: 'u1', email: 'a@b.co', app_metadata: { providers: ['google'] } };
      expect((await call('POST', '/password', body)).status).toBe(400);
      expect(f.authClientUsed).toBe(0);
    });

    it('verifica la actual, cambia la contraseña y cierra las demás sesiones', async () => {
      const res = await call('POST', '/password', body);
      expect(res.status).toBe(204);
      expect(f.calls.verify).toEqual([{ email: 'ana@vault.gg', password: 'Actual1!x' }]);
      expect(f.calls.updateUser).toEqual([{ password: 'Nueva2@yz' }]);
      expect(f.calls.signOut).toEqual([['auth', { scope: 'others' }]]);
    });

    it.each([
      ['sin actual', { ...body, current: '' }, 'La contraseña actual no es correcta.'],
      ['débil', { ...body, password: 'abc', repeat: 'abc' }, 'La contraseña debe tener'],
      ['repetición distinta', { ...body, repeat: 'Otra3#abc' }, 'Las contraseñas no coinciden.'],
      [
        'igual a la actual',
        { current: 'Nueva2@yz', password: 'Nueva2@yz', repeat: 'Nueva2@yz' },
        'distinta de la anterior',
      ],
    ])('%s → 400 sin verificar', async (_name, payload, message) => {
      const res = await call('POST', '/password', payload);
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toContain(message);
      expect(f.calls.verify).toEqual([]);
    });

    it('contraseña actual errónea → 401 y no cambia nada', async () => {
      f.verify = { error: { code: 'invalid_credentials' } };
      const res = await call('POST', '/password', body);
      expect(res.status).toBe(401);
      expect(await errorOf(res)).toBe('La contraseña actual no es correcta.');
      expect(f.calls.updateUser).toEqual([]);
    });

    it('límite de intentos al verificar → 429', async () => {
      f.verify = { error: { code: 'over_request_rate_limit' } };
      expect((await call('POST', '/password', body)).status).toBe(429);
    });

    it('same_password y weak_password de Auth → 400', async () => {
      f.updateUser = { error: { code: 'same_password' } };
      expect((await call('POST', '/password', body)).status).toBe(400);
      f.updateUser = { error: { code: 'weak_password' } };
      expect((await call('POST', '/password', body)).status).toBe(400);
    });

    it('error desconocido → 500 genérico y se registra', async () => {
      f.updateUser = { error: { code: 'raro' } };
      expect((await call('POST', '/password', body)).status).toBe(500);
      expect(logged).toHaveBeenCalled();
    });

    it('si falla cerrar las otras sesiones, el cambio sigue siendo 204', async () => {
      f.signOutOthers = { error: { message: 'x' } };
      expect((await call('POST', '/password', body)).status).toBe(204);
      expect(logged).toHaveBeenCalled();
    });
  });

  describe('DELETE /', () => {
    it('sin sesión → 401 y no borra', async () => {
      f.user = null;
      expect((await call('DELETE', '/', { confirm: 'ANA' })).status).toBe(401);
      expect(f.calls.deleted).toEqual([]);
    });

    it('confirmación que no coincide o vacía → 400 y no borra', async () => {
      for (const confirm of ['OTRO', '', undefined]) {
        const res = await call('DELETE', '/', { confirm });
        expect(res.status).toBe(400);
        expect(await errorOf(res)).toBe('El usuario no coincide.');
      }
      expect(f.calls.deleted).toEqual([]);
    });

    it('borra el id de la sesión (nunca del cuerpo) y cierra la sesión local', async () => {
      const res = await call('DELETE', '/', { confirm: ' ana ', id: 'otro', userId: 'otro' });
      expect(res.status).toBe(204);
      expect(f.calls.deleted).toEqual(['u1']);
      expect(f.calls.signOut).toEqual([['session', { scope: 'local' }]]);
    });

    it('perfil ausente o error de lectura → 500 y no borra', async () => {
      f.select = { data: null, error: null };
      expect((await call('DELETE', '/', { confirm: 'ANA' })).status).toBe(500);
      f.select = { data: null, error: { message: 'x' } };
      expect((await call('DELETE', '/', { confirm: 'ANA' })).status).toBe(500);
      expect(f.calls.deleted).toEqual([]);
    });

    it('fallo del borrado → 500 y no cierra sesión', async () => {
      f.deleteUser = { error: { message: 'x' } };
      expect((await call('DELETE', '/', { confirm: 'ANA' })).status).toBe(500);
      expect(f.calls.signOut).toEqual([]);
    });
  });

  it('sin configuración de Supabase → 500', async () => {
    f.sessionNull = true;
    expect((await call('PATCH', '/username', { username: 'Nuevo' })).status).toBe(500);
  });
});
