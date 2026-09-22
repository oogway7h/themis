import { describe, expect, it } from 'vitest';
import { isRedirect } from '@tanstack/react-router';
import { requireRole } from './require-role';
import type { AuthContextValue } from './auth-context';

function buildAuth(session: AuthContextValue['session']): AuthContextValue {
  return {
    status: session ? 'authenticated' : 'anonymous',
    session,
    getSession: () => session,
    login: () => {},
    logout: async () => {},
  };
}

describe('requireRole', () => {
  it('lanza un redirect a /login cuando no hay sesion', () => {
    try {
      requireRole(buildAuth(null), ['SUPERUSUARIO']);
      throw new Error('requireRole no lanzo nada');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { to: string } }).options.to).toBe('/login');
    }
  });

  it('lanza un redirect a / cuando hay sesion pero el rol no esta permitido', () => {
    try {
      requireRole(
        buildAuth({ role: 'ADMIN', nombreCompleto: 'Admin de Prueba' }),
        ['SUPERUSUARIO'],
      );
      throw new Error('requireRole no lanzo nada');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { to: string } }).options.to).toBe('/');
    }
  });

  it('no lanza nada cuando el rol de la sesion esta permitido', () => {
    expect(() =>
      requireRole(
        buildAuth({
          role: 'SUPERUSUARIO',
          nombreCompleto: 'Superusuario de Prueba',
        }),
        ['SUPERUSUARIO'],
      ),
    ).not.toThrow();
  });
});
