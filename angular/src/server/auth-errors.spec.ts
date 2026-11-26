import {
  CURRENT_PASSWORD_ERROR,
  INVALID_CREDENTIALS,
  RATE_LIMIT_ERROR,
  SAME_PASSWORD_ERROR,
  signInError,
  signUpError,
  updatePasswordError,
  verifyPasswordError,
} from '@/lib/auth-errors';
import { PASSWORD_ERROR } from '@/lib/auth-validation';

describe('lib/auth-errors', () => {
  describe('signUpError', () => {
    it.each([
      ['user_already_exists', 'Ese correo ya está registrado.'],
      ['email_exists', 'Ese correo ya está registrado.'],
      ['weak_password', PASSWORD_ERROR],
      ['over_request_rate_limit', RATE_LIMIT_ERROR],
      ['over_email_send_rate_limit', 'Demasiados correos enviados. Inténtalo más tarde.'],
    ])('%s', (code, message) => expect(signUpError(code)).toBe(message));

    it('código desconocido o ausente → null', () => {
      expect(signUpError('x')).toBeNull();
      expect(signUpError(undefined)).toBeNull();
    });
  });

  describe('signInError', () => {
    it.each([
      ['over_request_rate_limit', RATE_LIMIT_ERROR],
      ['email_not_confirmed', 'Confirma tu email antes de entrar.'],
      ['invalid_credentials', INVALID_CREDENTIALS],
    ])('%s', (code, message) => expect(signInError(code)).toBe(message));

    it('código desconocido → null', () => expect(signInError('x')).toBeNull());
  });

  describe('verifyPasswordError', () => {
    it.each([
      ['over_request_rate_limit', RATE_LIMIT_ERROR],
      ['invalid_credentials', CURRENT_PASSWORD_ERROR],
    ])('%s', (code, message) => expect(verifyPasswordError(code)).toBe(message));

    it('código desconocido → null', () => expect(verifyPasswordError('x')).toBeNull());
  });

  describe('updatePasswordError', () => {
    it.each([
      ['same_password', SAME_PASSWORD_ERROR],
      ['weak_password', PASSWORD_ERROR],
      ['over_request_rate_limit', RATE_LIMIT_ERROR],
    ])('%s', (code, message) => expect(updatePasswordError(code)).toBe(message));

    it('código desconocido → null', () => expect(updatePasswordError('x')).toBeNull());
  });
});
