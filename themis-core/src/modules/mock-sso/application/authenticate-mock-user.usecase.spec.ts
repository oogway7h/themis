import { UnauthorizedException } from '@nestjs/common';
import { AuthenticateMockUserUseCase } from './authenticate-mock-user.usecase';
import { InMemoryMockSsoUserRepository } from '../../../../test/doubles/in-memory-mock-sso-user.repository';
import { hashPassword } from '../infrastructure/hash.util';
import type { AppConfig } from '../../../config/configuration';
import { decodeAssertion } from './test-helpers/decode-assertion';

function buildConfig(): AppConfig {
  return {
    nodeEnv: 'test',
    port: 3000,
    apiPrefix: 'api/v1',
    corsOrigins: [],
    database: { url: '', directUrl: '' },
    jwt: { secret: 'x'.repeat(16) },
    ai: { baseUrl: '', token: '', timeoutMs: 1000 },
    chain: { rpcUrl: '', chainId: 1, relayerPrivateKey: '', contractAddress: '', semaphoreRegistryAddress: '' },
    ssoMock: { secret: 'x'.repeat(32), tokenTtlSeconds: 300 },
    registrationSigning: { privateKeyJwk: '{}', publicKeyJwk: '{}' },
  };
}

describe('AuthenticateMockUserUseCase', () => {
  let repository: InMemoryMockSsoUserRepository;
  let useCase: AuthenticateMockUserUseCase;
  const config = buildConfig();

  beforeEach(async () => {
    repository = new InMemoryMockSsoUserRepository();
    useCase = new AuthenticateMockUserUseCase(repository, config);

    await repository.create({
      codigoInstitucional: 'HABILITADO-1',
      passwordHash: hashPassword('clave-correcta'),
      nombreCompleto: 'Usuario Habilitado',
      facultad: 'FICCT',
      carrera: 'INGENIERIA_SISTEMAS',
      tipoUsuario: 'ESTUDIANTE',
      estadoAcademico: 'ACTIVO',
    });

    await repository.create({
      codigoInstitucional: 'DOCENTE-1',
      passwordHash: hashPassword('clave-correcta'),
      nombreCompleto: 'Usuario Docente',
      facultad: 'FICCT',
      carrera: 'INGENIERIA_INFORMATICA',
      tipoUsuario: 'DOCENTE',
      estadoAcademico: 'ACTIVO',
    });

    await repository.create({
      codigoInstitucional: 'INACTIVO-1',
      passwordHash: hashPassword('clave-correcta'),
      nombreCompleto: 'Usuario Inactivo',
      facultad: 'FICCT',
      carrera: 'INGENIERIA_ROBOTICA',
      tipoUsuario: 'ESTUDIANTE',
      estadoAcademico: 'INACTIVO',
    });
  });

  it('emite una assertion con habilitado=true para un estudiante activo de FICCT (AC-01, AC-03)', async () => {
    const { assertion } = await useCase.execute({
      codigoInstitucional: 'HABILITADO-1',
      password: 'clave-correcta',
    });

    const payload = decodeAssertion(assertion);
    expect(payload.habilitado).toBe(true);
    expect(payload.facultad).toBe('FICCT');
  });

  it('emite una assertion con habilitado=false para un docente (AC-03)', async () => {
    const { assertion } = await useCase.execute({
      codigoInstitucional: 'DOCENTE-1',
      password: 'clave-correcta',
    });

    expect(decodeAssertion(assertion).habilitado).toBe(false);
  });

  it('emite una assertion con habilitado=false para un estudiante inactivo (AC-03)', async () => {
    const { assertion } = await useCase.execute({
      codigoInstitucional: 'INACTIVO-1',
      password: 'clave-correcta',
    });

    expect(decodeAssertion(assertion).habilitado).toBe(false);
  });

  it('rechaza un codigoInstitucional inexistente con SSO_MOCK_INVALID_CREDENTIALS (AC-02)', async () => {
    await expect(
      useCase.execute({ codigoInstitucional: 'NO-EXISTE', password: 'x' }),
    ).rejects.toMatchObject(
      new UnauthorizedException('SSO_MOCK_INVALID_CREDENTIALS'),
    );
  });

  it('rechaza una contraseña incorrecta con el mismo error que un codigo inexistente (AC-02)', async () => {
    await expect(
      useCase.execute({
        codigoInstitucional: 'HABILITADO-1',
        password: 'incorrecta',
      }),
    ).rejects.toMatchObject(
      new UnauthorizedException('SSO_MOCK_INVALID_CREDENTIALS'),
    );
  });

  it('el payload de la assertion nunca incluye datos personales (AC-06)', async () => {
    const { assertion } = await useCase.execute({
      codigoInstitucional: 'HABILITADO-1',
      password: 'clave-correcta',
    });

    const payload = decodeAssertion(assertion) as unknown as Record<
      string,
      unknown
    >;
    expect(payload).not.toHaveProperty('codigoInstitucional');
    expect(payload).not.toHaveProperty('passwordHash');
    expect(payload).not.toHaveProperty('nombreCompleto');
  });
});
