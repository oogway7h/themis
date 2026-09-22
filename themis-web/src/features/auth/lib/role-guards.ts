import type { AuthContextValue } from './auth-context';
import { requireRole } from './require-role';

/**
 * Guards nombrados por rol: wrappers finitos sobre `requireRole` para que el
 * `beforeLoad` de una ruta exclusiva de un rol quede autodescriptivo (ej.
 * `requireSuperUsuario(context.auth)`), sin reimplementar la lógica de
 * redirect. Agregar más roles permitidos a una ruta sigue pasando por
 * `requireRole(auth, [...])` directamente.
 */
export function requireSuperUsuario(auth: AuthContextValue): void {
  requireRole(auth, ['SUPERUSUARIO']);
}

export function requireAdmin(auth: AuthContextValue): void {
  requireRole(auth, ['ADMIN']);
}

export function requireAuditor(auth: AuthContextValue): void {
  requireRole(auth, ['AUDITOR']);
}

export function requireAutoridadRegistro(auth: AuthContextValue): void {
  requireRole(auth, ['AUTORIDAD_REGISTRO']);
}

/**
 * Lotes de checkpoint (CU-07/08): los ve el ADMIN (solo lectura) y la
 * AUTORIDAD_REGISTRO (que ademas aprueba). El AUDITOR tambien puede en el
 * backend, pero hoy no tiene forma de listar elecciones (/elections es ADMIN).
 */
export function requireBatchViewer(auth: AuthContextValue): void {
  requireRole(auth, ['ADMIN', 'AUTORIDAD_REGISTRO']);
}
