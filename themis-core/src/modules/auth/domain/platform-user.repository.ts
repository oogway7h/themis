import { PlatformUser, PlatformRole } from './platform-user.entity';

export interface CreatePlatformUserInput {
  email: string;
  passwordHash: string;
  nombreCompleto: string;
  role: PlatformRole;
}

export interface UpdatePlatformUserInput {
  nombreCompleto: string;
  role: PlatformRole;
}

export interface FindAllActiveParams {
  skip: number;
  take: number;
  email?: string;
  role?: PlatformRole;
}

export interface FindAllActiveResult {
  items: PlatformUser[];
  total: number;
}

export interface PlatformUserRepository {
  findByEmail(email: string): Promise<PlatformUser | null>;
  findById(id: string): Promise<PlatformUser | null>;
  create(input: CreatePlatformUserInput): Promise<PlatformUser>;
  findAllActive(params: FindAllActiveParams): Promise<FindAllActiveResult>;
  update(id: string, input: UpdatePlatformUserInput): Promise<PlatformUser | null>;
  softDelete(id: string): Promise<PlatformUser | null>;
}

export const PLATFORM_USER_REPOSITORY = 'PLATFORM_USER_REPOSITORY';
