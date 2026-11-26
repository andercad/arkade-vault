import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { apiErrorHandler } from './json-errors';

function fakeRes(headersSent = false) {
  const res = {
    headersSent,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('apiErrorHandler', () => {
  const req = {} as Request;

  it('responde 400 JSON ante un cuerpo mal formado', () => {
    const res = fakeRes();
    const next = vi.fn();
    apiErrorHandler({ status: 400 }, req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Solicitud no válida.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 500 genérico, sin detalles, ante otros fallos', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = fakeRes();
    apiErrorHandler(new Error('secreto interno'), req, res as unknown as Response, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls[0])).not.toContain('secreto');
    spy.mockRestore();
  });

  it('delega en next si las cabeceras ya se enviaron', () => {
    const res = fakeRes(true);
    const next = vi.fn();
    const err = new Error('x');
    apiErrorHandler(err, req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
