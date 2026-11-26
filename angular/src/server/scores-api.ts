import { Router, type Request, type Response } from 'express';
import { GENERIC_ERROR } from '@/lib/auth-errors';
import type { SessionClientFactory } from './session';

/** Dependencias del router de puntuaciones; el cliente se inyecta para poder probarlo. */
export interface ScoresDeps {
  /** Cliente con la sesión de las cookies de la petición (clave publicable, RLS aplica). */
  sessionClient: SessionClientFactory;
}

const GAME_ID = /^[a-z0-9-]{1,40}$/;
/** La BD admite 0 a 1.000.000 (CHECK); lo que lo supera se recorta. */
const MAX_SCORE = 1_000_000;

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

/**
 * `POST /api/scores { gameId, score }`: guarda la puntuación del jugador con sesión.
 * `player_name` sale siempre de `profiles.username` y `user_id` lo pone la BD
 * (`default auth.uid()`); si el cuerpo trae un nombre, se ignora. Respuestas: 201, 400
 * entrada inválida, 401 sin sesión, 404 juego inexistente, 500 fallo de lectura/escritura.
 */
export function createScoresRouter(deps: ScoresDeps): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const gameId = body['gameId'];
    const score = body['score'];

    try {
      const supabase = deps.sessionClient(req, res);
      if (!supabase) return fail(res, 500, GENERIC_ERROR);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return fail(res, 401, 'Inicia sesión para guardar tu puntuación.');

      if (typeof gameId !== 'string' || !GAME_ID.test(gameId)) {
        return fail(res, 400, 'Juego no válido.');
      }
      if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
        return fail(res, 400, 'Puntuación no válida.');
      }

      const [game, profile] = await Promise.all([
        supabase.from('games').select('id').eq('id', gameId).maybeSingle(),
        supabase.from('profiles').select('username').eq('id', userId).maybeSingle(),
      ]);
      if (game.error || profile.error || !profile.data) {
        console.error('[scores] Error de lectura:', game.error ?? profile.error);
        return fail(res, 500, GENERIC_ERROR);
      }
      if (!game.data) return fail(res, 404, 'El juego no existe.');

      const { error } = await supabase.from('scores').insert({
        game_id: gameId,
        player_name: profile.data.username,
        score: Math.min(score, MAX_SCORE),
      });
      if (error) {
        console.error('[scores] Error al guardar:', error);
        return fail(res, 500, GENERIC_ERROR);
      }
      res.status(201).end();
    } catch (error) {
      console.error('[scores] Error inesperado:', error);
      if (!res.headersSent) fail(res, 500, GENERIC_ERROR);
    }
  });

  return router;
}
