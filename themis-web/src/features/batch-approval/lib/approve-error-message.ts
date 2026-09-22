import { ApiError } from '@/api/client';

/** Mensaje para el usuario segun el `code` de dominio que devuelve themis-core al aprobar. */
export function approveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'BATCH_ALREADY_APPROVED_BY_AUTHORITY':
        return 'Ya aprobaste este lote.';
      case 'BATCH_NOT_PENDING_APPROVAL':
        return 'El lote ya no está pendiente de aprobación.';
      case 'AUTHORITY_NOT_DESIGNATED_FOR_ELECTION':
        return 'Tu cuenta no está designada como autoridad de esta elección.';
      case 'BATCH_NOT_FOUND':
        return 'No se encontró el lote.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para aprobar este lote.';
    }
  }
  return 'No se pudo registrar la aprobación. Intenta de nuevo.';
}
