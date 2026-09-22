import {
  MockSsoUser,
  FacultadSso,
  CarreraSso,
  TipoUsuarioSso,
  EstadoAcademicoSso,
} from './mock-sso-user.entity';

export interface CreateMockSsoUserInput {
  codigoInstitucional: string;
  passwordHash: string;
  nombreCompleto: string;
  facultad: FacultadSso;
  carrera: CarreraSso;
  tipoUsuario: TipoUsuarioSso;
  estadoAcademico: EstadoAcademicoSso;
}

export interface MockSsoUserRepository {
  findByCodigoInstitucional(codigo: string): Promise<MockSsoUser | null>;
  create(input: CreateMockSsoUserInput): Promise<MockSsoUser>;
  list(): Promise<MockSsoUser[]>;
}

export const MOCK_SSO_USER_REPOSITORY = 'MOCK_SSO_USER_REPOSITORY';
