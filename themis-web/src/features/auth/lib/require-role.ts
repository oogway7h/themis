import { redirect } from '@tanstack/react-router';
import type { AuthContextValue } from './auth-context';
import type { PlatformRole } from '../types/auth.types';

/**
 * Guarda de ruta: exige sesion Y que el rol este en `allowed`. Se usa en el
 * `beforeLoad` de rutas restringidas a un rol especifico (ej. /admin/users,
 * solo SUPERUSUARIO) ademas del guard general de requireAuth en
 * _authenticated.tsx.
 */
export function requireRole(
  auth: AuthContextValue,
  allowed: PlatformRole[],
): void {
  const session = auth.getSession();

  if (!session) {
    throw redirect({ to: '/login' });
  }

  if (!allowed.includes(session.role)) {
    throw redirect({ to: '/' });
  }
}
