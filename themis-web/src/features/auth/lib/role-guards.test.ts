import { describe, expect, it } from 'vitest';
import { isRedirect } from '@tanstack/react-router';
import { requireBatchViewer } from './role-guards';
import type { AuthContextValue } from './auth-context';
import type { PlatformRole } from '../types/auth.types';

function buildAuth(role: PlatformRole | null): AuthContextValue {
  const session = role ? { role, nombreCompleto: 'Cuenta de Prueba' } : null;
  return {
    status: session ? 'authenticated' : 'anonymous',
    session,
    getSession: () => session,
    login: () => {},
    logout: async () => {},
  };
}

describe('requireBatchViewer', () => {
  it.each<PlatformRole>(['ADMIN', 'AUTORIDAD_REGISTRO'])('deja pasar a %s', (role) => {
    expect(() => requireBatchViewer(buildAuth(role))).not.toThrow();
  });

  it.each<PlatformRole>(['AUDITOR', 'SUPERUSUARIO'])('redirige a / a %s', (role) => {
    try {
      requireBatchViewer(buildAuth(role));
      throw new Error('requireBatchViewer no lanzo nada');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { to: string } }).options.to).toBe('/');
    }
  });

  it('redirige a /login sin sesion', () => {
    try {
      requireBatchViewer(buildAuth(null));
      throw new Error('requireBatchViewer no lanzo nada');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { to: string } }).options.to).toBe('/login');
    }
  });
});
