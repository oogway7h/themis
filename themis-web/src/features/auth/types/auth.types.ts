// Contrato TS a mano, siguiendo exactamente
// themis-core/src/modules/auth/platform-session.contract.json y los DTOs de
// themis-core/src/modules/auth/presentation/dto/*.
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript
// (HU00_1, Fase 1 de la hoja de ruta).

export type PlatformRole =
  | 'ADMIN'
  | 'AUTORIDAD_REGISTRO'
  | 'AUDITOR'
  | 'SUPERUSUARIO';

/** Respuesta de POST /auth/login. El JWT viaja en una cookie httpOnly
 * (access_token), nunca en este body — el frontend no tiene ni necesita
 * acceso al token en si. */
export interface LoginResponse {
  role: PlatformRole;
  nombreCompleto: string;
}

/** Respuesta de GET /auth/me. */
export interface MeResponse {
  sub: string;
  role: PlatformRole;
  nombreCompleto: string;
}
