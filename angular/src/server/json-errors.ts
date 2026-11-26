import type { ErrorRequestHandler } from 'express';

/**
 * Manejador de errores de `/api/*`: responde JSON (nunca la página de error de Express con
 * traza y rutas). Un cuerpo JSON mal formado da 400; cualquier otro fallo, 500 genérico.
 */
export const apiErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('[api] Error no controlado:', err);
  res.status(status).json({
    error: status === 400 ? 'Solicitud no válida.' : 'No se pudo completar la solicitud.',
  });
};
