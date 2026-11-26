import { HttpErrorResponse } from '@angular/common/http';
import { GENERIC_ERROR } from '@/lib/auth-errors';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('devuelve el mensaje del BFF', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { error: 'Ese usuario ya existe.' },
    });
    expect(apiErrorMessage(error)).toBe('Ese usuario ya existe.');
  });

  it('cuerpo sin mensaje, vacío o de otro tipo → genérico', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500 }))).toBe(GENERIC_ERROR);
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500, error: { error: '' } }))).toBe(
      GENERIC_ERROR,
    );
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500, error: { error: 3 } }))).toBe(
      GENERIC_ERROR,
    );
  });

  it('un error que no es HTTP → genérico', () => {
    expect(apiErrorMessage(new Error('boom'))).toBe(GENERIC_ERROR);
  });
});
