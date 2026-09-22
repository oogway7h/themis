import { redirect } from '@tanstack/react-router';
import type { AuthContextValue } from './auth-context';

/**
 * Guarda de ruta: usada en el `beforeLoad` de cualquier ruta administrativa
 * (HU00_1 AC-08). Separada del route tree para poder testearla sin montar
 * el router completo.
 */
export function requireAuth(auth: AuthContextValue): void {
  if (!auth.getSession()) {
    throw redirect({ to: '/login' });
  }
}
