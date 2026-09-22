import { AuthenticateMockUserUseCase } from './authenticate-mock-user.usecase';
import { VerifyMockAssertionUseCase } from './verify-mock-assertion.usecase';
import { InMemoryMockSsoUserRepository } from '../../../../test/doubles/in-memory-mock-sso-user.repository';
import { hashPassword } from '../infrastructure/hash.util';
import { signAssertion } from '../domain/mock-sso-assertion';
import type { AppConfig } from '../../../config/configuration';

function buildConfig(overrides: Partial<AppConfig['ssoMock']> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 3000,
    apiPrefix: 'api/v1',
    corsOrigins: [],
    database: { url: '', directUrl: '' },
    jwt: { secret: 'x'.repeat(16) },
    ai: { baseUrl: '', token: '', timeoutMs: 1000 },
    chain: { rpcUrl: '', chainId: 1, relayerPrivateKey: '', contractAddress: '', semaphoreRegistryAddress: '' },
    ssoMock: { secret: 'x'.repeat(32), tokenTtlSeconds: 300, ...overrides },
    registrationSigning: { privateKeyJwk: '{}', publicKeyJwk: '{}' },
  };
}

describe('VerifyMockAssertionUseCase', () => {
  it('verifica como valida una assertion recien emitida y expone sub/habilitado (AC-04)', async () => {
    const config = buildConfig();
    const repository = new InMemoryMockSsoUserRepository();
    const authenticate = new AuthenticateMockUserUseCase(repository, config);
    const verify = new VerifyMockAssertionUseCase(config);

    const user = await repository.create({
      codigoInstitucional: 'HABILITADO-1',
      passwordHash: hashPassword('clave-correcta'),
      nombreCompleto: 'Usuario Habilitado',
      facultad: 'FICCT',
      carrera: 'INGENIERIA_SISTEMAS',
      tipoUsuario: 'ESTUDIANTE',
      estadoAcademico: 'ACTIVO',
    });

    const { assertion } = await authenticate.execute({
      codigoInstitucional: 'HABILITADO-1',
      password: 'clave-correcta',
    });

    const result = verify.execute({ assertion });

    expect(result).toMatchObject({
      valid: true,
      sub: user.id,
      facultad: 'FICCT',
      habilitado: true,
    });
  });

  it('rechaza una assertion con la firma alterada', () => {
    const config = buildConfig();
    const verify = new VerifyMockAssertionUseCase(config);

    const assertion = signAssertion(
      {
        sub: 'x',
        facultad: 'FICCT',
        tipoUsuario: 'ESTUDIANTE',
        habilitado: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      config.ssoMock.secret,
    );

    const tampered = assertion.slice(0, -4) + 'ffff';

    expect(verify.execute({ assertion: tampered })).toEqual({ valid: false });
  });

  it('rechaza una assertion expirada (AC-04)', () => {
    const config = buildConfig();
    const verify = new VerifyMockAssertionUseCase(config);

    const now = Math.floor(Date.now() / 1000);
    const expired = signAssertion(
      {
        sub: 'x',
        facultad: 'FICCT',
        tipoUsuario: 'ESTUDIANTE',
        habilitado: true,
        iat: now - 1000,
        exp: now - 1,
      },
      config.ssoMock.secret,
    );

    expect(verify.execute({ assertion: expired })).toEqual({ valid: false });
  });

  it('no depende del repositorio de usuarios (solo del secreto compartido)', () => {
    expect(VerifyMockAssertionUseCase.length).toBe(1);
  });
});
