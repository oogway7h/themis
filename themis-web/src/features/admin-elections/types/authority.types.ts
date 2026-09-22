// Contrato TS a mano, siguiendo themis-core/src/modules/elections/election.contract.json
// (sección Authority) y el DTO de list-users-response.dto.ts para la búsqueda de cuentas.
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.

export interface AuthorityDto {
  id: string;
  rolDescriptivo: string;
  platformUserEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignateAuthorityInput {
  platformUserId: string;
  rolDescriptivo: string;
}

export interface ReplaceAuthorityInput {
  platformUserId?: string;
  rolDescriptivo?: string;
}

export interface PlatformUserSearchResult {
  id: string;
  email: string;
  role: 'ADMIN' | 'AUTORIDAD_REGISTRO' | 'AUDITOR' | 'SUPERUSUARIO';
  isActive: boolean;
}

export interface PlatformUserSearchResponse {
  data: PlatformUserSearchResult[];
}
