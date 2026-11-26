import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiRouter, type ApiClient } from './api';

interface Result {
  data: unknown;
  error: unknown;
}

/** Llamada registrada sobre el builder falso, para comprobar filtros y orden. */
interface Call {
  table: string;
  ops: [string, ...unknown[]][];
}

/**
 * Cliente Supabase falso: cada `from(tabla)` devuelve un builder encadenable y "thenable"
 * que resuelve con lo configurado para esa tabla. Registra las operaciones aplicadas.
 */
function fakeClient(results: Record<string, Result>, calls: Call[] = []): ApiClient {
  const builder = (table: string) => {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const result = results[table] ?? { data: [], error: null };
    const proxy: unknown = new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (prop === 'then') {
            // `maybeSingle` ya devuelve un objeto; el resto resuelve la lista.
            return (resolve: (v: Result) => unknown) => resolve(result);
          }
          return (...args: unknown[]) => {
            call.ops.push([prop, ...args]);
            if (prop === 'maybeSingle') {
              const rows = result.data as unknown[] | unknown;
              return Promise.resolve({
                data: Array.isArray(rows) ? (rows[0] ?? null) : rows,
                error: result.error,
              });
            }
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  return { from: builder } as unknown as ApiClient;
}

describe('createApiRouter', () => {
  let server: Server;
  let base: string;
  let client: ApiClient | null;
  let calls: Call[];

  const gameRow = {
    id: 'snake',
    title: 'SNAKE',
    short: 's',
    long: 'l',
    cat: 'ARCADE',
    cover: '/c.png',
    color: 'green',
    sort_order: 1,
  };

  async function get(path: string): Promise<{ status: number; body: unknown }> {
    const res = await fetch(base + path);
    return { status: res.status, body: await res.json() };
  }

  function use(results: Record<string, Result>): void {
    client = fakeClient(results, calls);
  }

  beforeEach(async () => {
    calls = [];
    client = null;
    const app = express();
    app.use(
      '/api',
      createApiRouter(() => client),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  describe('GET /api/games', () => {
    it('200 con los juegos y sus estadísticas', async () => {
      use({
        games: { data: [gameRow], error: null },
        game_stats: { data: [{ game_id: 'snake', best: 99, plays: 7 }], error: null },
      });
      const { status, body } = await get('/api/games');
      expect(status).toBe(200);
      expect(body).toEqual([
        {
          id: 'snake',
          title: 'SNAKE',
          short: 's',
          long: 'l',
          cat: 'ARCADE',
          cover: '/c.png',
          color: 'green',
          best: 99,
          plays: 7,
        },
      ]);
      expect(calls[0].ops).toContainEqual(['order', 'sort_order']);
    });

    it('best y plays a 0 si no hay estadísticas', async () => {
      use({ games: { data: [gameRow], error: null }, game_stats: { data: [], error: null } });
      const { body } = await get('/api/games');
      expect(body).toMatchObject([{ best: 0, plays: 0 }]);
    });

    it('500 si falla Supabase', async () => {
      use({ games: { data: null, error: { message: 'x' } } });
      expect((await get('/api/games')).status).toBe(500);
    });

    it('500 si no hay cliente (sin configuración)', async () => {
      expect((await get('/api/games')).status).toBe(500);
    });
  });

  describe('GET /api/games/:id', () => {
    it('200 con el juego', async () => {
      use({
        games: { data: gameRow, error: null },
        game_stats: { data: { game_id: 'snake', best: 5, plays: 2 }, error: null },
      });
      const { status, body } = await get('/api/games/snake');
      expect(status).toBe(200);
      expect(body).toMatchObject({ id: 'snake', best: 5, plays: 2 });
    });

    it('404 con id no válido', async () => {
      use({});
      expect((await get('/api/games/XX!')).status).toBe(404);
    });

    it('404 si no existe', async () => {
      use({ games: { data: null, error: null }, game_stats: { data: null, error: null } });
      expect((await get('/api/games/nope')).status).toBe(404);
    });

    it('500 si falla Supabase', async () => {
      use({ games: { data: null, error: { message: 'x' } } });
      expect((await get('/api/games/snake')).status).toBe(500);
    });
  });

  describe('GET /api/games/:id/scores', () => {
    const scoreRows = [
      { player_name: 'ANA', score: 30, created_at: '2026-01-05T10:00:00Z' },
      { player_name: 'BOB', score: 20, created_at: '2026-01-06T10:00:00Z' },
    ];

    function ok(): void {
      use({
        games: { data: { id: 'snake' }, error: null },
        scores: { data: scoreRows, error: null },
      });
    }

    function scoresCall(): Call {
      return calls.find((c) => c.table === 'scores') as Call;
    }

    it('200 con rank consecutivo y fecha formateada', async () => {
      ok();
      const { status, body } = await get('/api/games/snake/scores');
      expect(status).toBe(200);
      expect(body).toEqual([
        { rank: 1, name: 'ANA', score: 30, date: '05/01/2026' },
        { rank: 2, name: 'BOB', score: 20, date: '06/01/2026' },
      ]);
    });

    it('ordena por score desc y created_at asc', async () => {
      ok();
      await get('/api/games/snake/scores');
      const ops = scoresCall().ops;
      expect(ops).toContainEqual(['order', 'score', { ascending: false }]);
      expect(ops).toContainEqual(['order', 'created_at', { ascending: true }]);
    });

    it('limit por defecto 10', async () => {
      ok();
      await get('/api/games/snake/scores');
      expect(scoresCall().ops).toContainEqual(['limit', 10]);
    });

    it.each(['1', '12'])('acepta limit=%s', async (limit) => {
      ok();
      const { status } = await get(`/api/games/snake/scores?limit=${limit}`);
      expect(status).toBe(200);
      expect(scoresCall().ops).toContainEqual(['limit', Number(limit)]);
    });

    it.each(['0', '13', '99', '-1', 'abc', '1.5', ''])('400 con limit=%s', async (limit) => {
      ok();
      expect((await get(`/api/games/snake/scores?limit=${limit}`)).status).toBe(400);
    });

    it('404 con id no válido', async () => {
      ok();
      expect((await get('/api/games/XX!/scores')).status).toBe(404);
    });

    it('404 si el juego no existe', async () => {
      use({ games: { data: null, error: null }, scores: { data: [], error: null } });
      expect((await get('/api/games/nope/scores')).status).toBe(404);
    });

    it('500 si falla Supabase', async () => {
      use({
        games: { data: { id: 'snake' }, error: null },
        scores: { data: null, error: { message: 'x' } },
      });
      expect((await get('/api/games/snake/scores')).status).toBe(500);
    });
  });

  describe('GET /api/scores/recent', () => {
    it('200 con ago calculado en servidor y título/color del juego', async () => {
      const iso = new Date(Date.now() - 5 * 60_000).toISOString();
      use({
        scores: {
          data: [
            { game_id: 'snake', player_name: 'ANA', score: 10, created_at: iso },
            { game_id: 'ghost', player_name: 'BOB', score: 5, created_at: iso },
          ],
          error: null,
        },
        games: { data: [{ id: 'snake', title: 'SNAKE', color: 'green' }], error: null },
      });
      const { status, body } = await get('/api/scores/recent');
      expect(status).toBe(200);
      expect(body).toEqual([
        { player: 'ANA', gameTitle: 'SNAKE', color: 'green', score: 10, ago: 'hace 5 min' },
        { player: 'BOB', gameTitle: 'GHOST', color: 'cyan', score: 5, ago: 'hace 5 min' },
      ]);
      expect(calls[0].ops).toContainEqual(['limit', 8]);
    });

    it('500 si falla Supabase', async () => {
      use({ scores: { data: null, error: { message: 'x' } } });
      expect((await get('/api/scores/recent')).status).toBe(500);
    });
  });

  describe('GET /api/scores/top-today', () => {
    it('200 con top 5 de las últimas 24 h', async () => {
      use({ scores: { data: [{ player_name: 'ANA', score: 10 }], error: null } });
      const before = Date.now();
      const { status, body } = await get('/api/scores/top-today');
      expect(status).toBe(200);
      expect(body).toEqual([{ player: 'ANA', score: 10 }]);
      const ops = calls[0].ops;
      expect(ops).toContainEqual(['limit', 5]);
      const gte = ops.find((o) => o[0] === 'gte') as [string, string, string];
      const since = new Date(gte[2]).getTime();
      expect(Math.abs(before - 24 * 3600_000 - since)).toBeLessThan(5000);
    });

    it('500 si falla Supabase', async () => {
      use({ scores: { data: null, error: { message: 'x' } } });
      expect((await get('/api/scores/top-today')).status).toBe(500);
    });
  });

  it('cualquier otra /api/* → 404 JSON', async () => {
    use({});
    const { status, body } = await get('/api/nada');
    expect(status).toBe(404);
    expect(body).toEqual({ error: 'not_found' });
  });
});
