import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toGame, type AccentColor } from '@/lib/games';
import { formatScoreDate, timeAgo } from '@/lib/score-format';
import type { ScoreRow } from '@/lib/scores';
import type { Database } from '@/lib/supabase/database.types';

/** Cliente Supabase de solo lectura (clave publicable, sin sesión). */
export type ApiClient = SupabaseClient<Database>;

/** Devuelve el cliente, o `null` si falta la configuración. Inyectable para los tests. */
export type ApiClientFactory = () => ApiClient | null;

type Handler = (supabase: ApiClient, req: Request, res: Response) => Promise<void>;

const GAME_ID = /^[a-z0-9-]{1,40}$/;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 12;
const RECENT_LIMIT = 8;
const TOP_TODAY_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

/** `limit` entero 1-12 (defecto 10); `null` si está fuera de rango o no es numérico. */
function parseLimit(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_LIMIT;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_LIMIT ? n : null;
}

/**
 * Rutas `/api/*` del BFF: solo lectura con la clave publicable y sin sesión (las policies
 * RLS siguen protegiendo los datos). Errores: 400 entrada inválida, 404 no existe, 500 lectura.
 */
export function createApiRouter(createClient: ApiClientFactory): Router {
  const router = Router();

  /** Envuelve un handler: sin cliente o con excepción → 500 `read_failed`. */
  const read =
    (handler: Handler) =>
    async (req: Request, res: Response): Promise<void> => {
      const supabase = createClient();
      if (!supabase) return fail(res, 500, 'read_failed');
      try {
        await handler(supabase, req, res);
      } catch {
        if (!res.headersSent) fail(res, 500, 'read_failed');
      }
    };

  // GET /api/games → Game[] por sort_order.
  router.get(
    '/games',
    read(async (supabase, _req, res) => {
      const [games, stats] = await Promise.all([
        supabase.from('games').select('*').order('sort_order'),
        supabase.from('game_stats').select('*'),
      ]);
      if (games.error || stats.error) return fail(res, 500, 'read_failed');
      const byId = new Map(stats.data.map((s) => [s.game_id, s]));
      res.json(games.data.map((g) => toGame(g, byId.get(g.id))));
    }),
  );

  // GET /api/games/:id/scores?limit=N → ScoreRow[] (score desc, created_at asc, rank consecutivo).
  router.get(
    '/games/:id/scores',
    read(async (supabase, req, res) => {
      const id = req.params['id'] as string;
      if (!GAME_ID.test(id)) return fail(res, 404, 'not_found');
      const limit = parseLimit(req.query['limit']);
      if (limit === null) return fail(res, 400, 'invalid_limit');
      const [game, scores] = await Promise.all([
        supabase.from('games').select('id').eq('id', id).maybeSingle(),
        supabase
          .from('scores')
          .select('player_name, score, created_at')
          .eq('game_id', id)
          .order('score', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(limit),
      ]);
      if (game.error || scores.error) return fail(res, 500, 'read_failed');
      if (!game.data) return fail(res, 404, 'not_found');
      const rows: ScoreRow[] = scores.data.map((r, i) => ({
        rank: i + 1,
        name: r.player_name,
        score: r.score,
        date: formatScoreDate(r.created_at),
      }));
      res.json(rows);
    }),
  );

  // GET /api/games/:id → Game (con best/plays de game_stats).
  router.get(
    '/games/:id',
    read(async (supabase, req, res) => {
      const id = req.params['id'] as string;
      if (!GAME_ID.test(id)) return fail(res, 404, 'not_found');
      const [game, stats] = await Promise.all([
        supabase.from('games').select('*').eq('id', id).maybeSingle(),
        supabase.from('game_stats').select('*').eq('game_id', id).maybeSingle(),
      ]);
      if (game.error || stats.error) return fail(res, 500, 'read_failed');
      if (!game.data) return fail(res, 404, 'not_found');
      res.json(toGame(game.data, stats.data ?? undefined));
    }),
  );

  // GET /api/scores/recent → últimas 8 puntuaciones con `ago` calculado en servidor.
  router.get(
    '/scores/recent',
    read(async (supabase, _req, res) => {
      const [scores, games] = await Promise.all([
        supabase
          .from('scores')
          .select('game_id, player_name, score, created_at')
          .order('created_at', { ascending: false })
          .limit(RECENT_LIMIT),
        supabase.from('games').select('id, title, color'),
      ]);
      if (scores.error || games.error) return fail(res, 500, 'read_failed');
      const byId = new Map(games.data.map((g) => [g.id, g]));
      res.json(
        scores.data.map((r) => {
          const g = byId.get(r.game_id);
          return {
            player: r.player_name,
            gameTitle: g?.title ?? r.game_id.toUpperCase(),
            color: (g?.color ?? 'cyan') as AccentColor,
            score: r.score,
            ago: timeAgo(r.created_at),
          };
        }),
      );
    }),
  );

  // GET /api/scores/top-today → top 5 de las últimas 24 h.
  router.get(
    '/scores/top-today',
    read(async (supabase, _req, res) => {
      const since = new Date(Date.now() - DAY_MS).toISOString();
      const { data, error } = await supabase
        .from('scores')
        .select('player_name, score')
        .gte('created_at', since)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(TOP_TODAY_LIMIT);
      if (error) return fail(res, 500, 'read_failed');
      res.json(data.map((r) => ({ player: r.player_name, score: r.score })));
    }),
  );

  // Cualquier otra ruta /api/* no existe (no debe caer en el handler de Angular).
  router.use((_req, res) => fail(res, 404, 'not_found'));

  return router;
}
