import { describe, expect, it } from 'vitest';
import { isRedirect } from '@tanstack/react-router';
import { requireAuth } from './require-auth';
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

describe('requireAuth', () => {
  it('lanza un redirect a /login cuando no hay sesion (AC-08)', () => {
    try {
      requireAuth(buildAuth(null));
      throw new Error('requireAuth no lanzo nada');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { to: string } }).options.to).toBe('/login');
    }
  });

  it('no lanza nada cuando hay sesion activa', () => {
    expect(() =>
      requireAuth(
        buildAuth({ role: 'ADMIN', nombreCompleto: 'Admin de Prueba' }),
      ),
    ).not.toThrow();
  });
});
