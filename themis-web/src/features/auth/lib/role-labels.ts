import type { PlatformRole } from '../types/auth.types';

/** Etiquetas en español para mostrar en UI — nunca usar el valor crudo del enum. */
export const ROLE_LABELS: Record<PlatformRole, string> = {
  ADMIN: 'Administrador',
  AUTORIDAD_REGISTRO: 'Autoridad de Registro',
  AUDITOR: 'Auditor',
  SUPERUSUARIO: 'Super Administrador',
};
