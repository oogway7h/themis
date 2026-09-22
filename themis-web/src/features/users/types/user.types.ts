// Contrato TS a mano, siguiendo
// themis-core/src/modules/auth/presentation/dto/platform-user-response.dto.ts,
// list-users-response.dto.ts y update-user.dto.ts.
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.

export type CreatableRole = 'ADMIN' | 'AUTORIDAD_REGISTRO' | 'AUDITOR';

export interface PlatformUserDto {
  id: string;
  email: string;
  nombreCompleto: string;
  role: CreatableRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  nombreCompleto: string;
  role: CreatableRole;
}

export interface UpdateUserRequest {
  nombreCompleto: string;
  role: CreatableRole;
}

export interface PaginatedUsersResponse {
  data: PlatformUserDto[];
  total: number;
  page: number;
  pageSize: number;
}
