import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createScoresRouter } from './scores-api';
import type { DbClient } from './supabase';

interface Fakes {
  userId: string | null;
  game: { data: { id: string } | null; error: unknown };
  profile: { data: { username: string } | null; error: unknown };
  insert: { error: unknown };
  inserted: unknown[];
  sessionNull: boolean;
}

const fresh = (): Fakes => ({
  userId: 'u1',
  game: { data: { id: 'snake' }, error: null },
  profile: { data: { username: 'ANDER' }, error: null },
  insert: { error: null },
  inserted: [],
  sessionNull: false,
});

describe('createScoresRouter', () => {
  let server: Server;
  let base: string;
  let f: Fakes;
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: f.userId ? { id: f.userId } : null } }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(table === 'games' ? f.game : f.profile),
        }),
      }),
      insert: (row: unknown) => {
        f.inserted.push(row);
        return Promise.resolve(f.insert);
      },
    }),
  } as unknown as DbClient;

  beforeAll(async () => {
    const app = express();
    app.use(
      '/api/scores',
      express.json(),
      createScoresRouter({ sessionClient: () => (f.sessionNull ? null : client) }),
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

  const post = (body: unknown) =>
    fetch(`${base}/api/scores`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('sin sesión → 401 y no inserta', async () => {
    f.userId = null;
    const res = await post({ gameId: 'snake', score: 10 });
    expect(res.status).toBe(401);
    expect(f.inserted).toEqual([]);
  });

  it('guarda con 201 y el nombre del perfil del servidor', async () => {
    const res = await post({ gameId: 'snake', score: 10 });
    expect(res.status).toBe(201);
    expect(f.inserted).toEqual([{ game_id: 'snake', player_name: 'ANDER', score: 10 }]);
  });

  it('ignora un player_name enviado por el cliente', async () => {
    await post({ gameId: 'snake', score: 10, player_name: 'HACKER', name: 'HACKER' });
    expect(f.inserted).toEqual([{ game_id: 'snake', player_name: 'ANDER', score: 10 }]);
  });

  it('recorta score a 1.000.000 y admite 0', async () => {
    await post({ gameId: 'snake', score: 5_000_000 });
    await post({ gameId: 'snake', score: 0 });
    expect(f.inserted).toEqual([
      { game_id: 'snake', player_name: 'ANDER', score: 1_000_000 },
      { game_id: 'snake', player_name: 'ANDER', score: 0 },
    ]);
  });

  it.each([['Snake'], ['a b'], [''], ['x'.repeat(41)], [7], [null]])(
    'gameId inválido %j → 400',
    async (gameId) => {
      const res = await post({ gameId, score: 10 });
      expect(res.status).toBe(400);
      expect(f.inserted).toEqual([]);
    },
  );

  it.each([[-1], [1.5], ['10'], [null], [Number.NaN]])('score inválido %j → 400', async (score) => {
    const res = await post({ gameId: 'snake', score });
    expect(res.status).toBe(400);
    expect(f.inserted).toEqual([]);
  });

  it('cuerpo vacío → 400', async () => {
    const res = await fetch(`${base}/api/scores`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('juego inexistente → 404', async () => {
    f.game = { data: null, error: null };
    const res = await post({ gameId: 'nope', score: 10 });
    expect(res.status).toBe(404);
    expect(f.inserted).toEqual([]);
  });

  it('error de lectura o sin perfil → 500 genérico', async () => {
    f.profile = { data: null, error: null };
    expect((await post({ gameId: 'snake', score: 10 })).status).toBe(500);
    f.profile = { data: { username: 'ANDER' }, error: null };
    f.game = { data: null, error: { message: 'x' } };
    expect((await post({ gameId: 'snake', score: 10 })).status).toBe(500);
    expect(logged).toHaveBeenCalled();
  });

  it('fallo al insertar (RLS/CHECK) → 500 con { error }', async () => {
    f.insert = { error: { message: 'rls' } };
    const res = await post({ gameId: 'snake', score: 10 });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  it('sin configuración de Supabase → 500', async () => {
    f.sessionNull = true;
    expect((await post({ gameId: 'snake', score: 10 })).status).toBe(500);
  });
});
