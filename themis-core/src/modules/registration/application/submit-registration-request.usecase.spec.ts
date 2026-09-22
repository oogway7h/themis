import { createHmac, webcrypto } from 'node:crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { SubmitRegistrationRequestUseCase } from './submit-registration-request.usecase';
import {
  RegistrationAlreadyRegisteredError,
  RegistrationInvalidAssertionError,
  RegistrationNotEligibleError,
  RegistrationWindowClosedError,
} from './registration.errors';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import { VerifyMockAssertionUseCase } from '../../mock-sso/application/verify-mock-assertion.usecase';
import { RegistrationSigningService } from '../infrastructure/registration-signing.service';
import { signAssertion } from '../../mock-sso/domain/mock-sso-assertion';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryRegistrationRequestRepository } from '../../../../test/doubles/in-memory-registration-request.repository';
import type { AppConfig } from '../../../config/configuration';

async function buildConfig(): Promise<AppConfig> {
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const { privateKey, publicKey } = await suite.generateKey({
    publicExponent: Uint8Array.from([1, 0, 1]),
    modulusLength: 2048,
  });
  const privateKeyJwk = await webcrypto.subtle.exportKey('jwk', privateKey);
  const publicKeyJwk = await webcrypto.subtle.exportKey('jwk', publicKey);

  return {
    nodeEnv: 'test',
    port: 3000,
    apiPrefix: 'api/v1',
    corsOrigins: [],
    database: { url: '', directUrl: '' },
    jwt: { secret: 'x'.repeat(16) },
    ai: { baseUrl: '', token: '', timeoutMs: 1000 },
    chain: { rpcUrl: '', chainId: 1, relayerPrivateKey: '', contractAddress: '', semaphoreRegistryAddress: '' },
    ssoMock: { secret: 'y'.repeat(32), tokenTtlSeconds: 300 },
    registrationSigning: {
      privateKeyJwk: JSON.stringify(privateKeyJwk),
      publicKeyJwk: JSON.stringify(publicKeyJwk),
    },
  };
}

function buildAssertion(
  config: AppConfig,
  overrides: Partial<{ sub: string; habilitado: boolean; exp: number }> = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  return signAssertion(
    {
      sub: overrides.sub ?? 'sub-votante-1',
      facultad: 'FICCT',
      tipoUsuario: 'ESTUDIANTE',
      habilitado: overrides.habilitado ?? true,
      iat: now,
      exp: overrides.exp ?? now + 300,
    },
    config.ssoMock.secret,
  );
}

describe('SubmitRegistrationRequestUseCase', () => {
  let config: AppConfig;
  let electionRepository: InMemoryElectionRepository;
  let registrationRepository: InMemoryRegistrationRequestRepository;
  let verifyMockAssertion: VerifyMockAssertionUseCase;
  let signingService: RegistrationSigningService;
  let useCase: SubmitRegistrationRequestUseCase;

  beforeEach(async () => {
    config = await buildConfig();
    electionRepository = new InMemoryElectionRepository();
    registrationRepository = new InMemoryRegistrationRequestRepository();
    verifyMockAssertion = new VerifyMockAssertionUseCase(config);
    signingService = new RegistrationSigningService(config);
    await signingService.onModuleInit();
    useCase = new SubmitRegistrationRequestUseCase(
      electionRepository,
      registrationRepository,
      verifyMockAssertion,
      signingService,
      config,
    );
  });

  async function createOpenElection() {
    const election = await electionRepository.create({
      nombre: 'Representante FICCT',
      registroInicio: new Date('2026-01-01T00:00:00Z'),
      registroFin: new Date('2026-01-10T00:00:00Z'),
      votacionInicio: new Date('2026-01-10T00:00:00Z'),
      votacionFin: new Date('2026-01-12T00:00:00Z'),
      opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      createdBy: 'admin-1',
    });
    electionRepository.forceStatus(election.id, 'REGISTRO_ABIERTO');
    return election;
  }

  it('registra una solicitud pendiente para una assertion valida y habilitada, y devuelve una firma ciega valida', async () => {
    const election = await createOpenElection();
    const assertion = buildAssertion(config);

    const suite = RSABSSA.SHA384.PSS.Randomized();
    const publicKey = await webcrypto.subtle.importKey(
      'jwk',
      JSON.parse(config.registrationSigning.publicKeyJwk),
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify'],
    );
    const message = new TextEncoder().encode('13565035219614459783078582717089175586548');
    const preparedMsg = suite.prepare(message);
    const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);
    const blindedMessage = Buffer.from(blindedMsg).toString('base64');

    const { request, blindSignature } = await useCase.execute(election.id, {
      assertion,
      blindedMessage,
    });

    expect(request.status).toBe('PENDING');
    expect(request.blindedValue).toBe(blindedMessage);
    expect(request.electionId).toBe(election.id);
    expect(request.scopedTokenHash).toBe(
      createHmac('sha256', config.ssoMock.secret)
        .update(`sub-votante-1:${election.id}`)
        .digest('hex'),
    );

    // ronda completa: el backend nunca vio "message", pero la firma finalizada
    // es valida sobre el mensaje real - prueba que el cegado funciona de punta a punta.
    const signature = await suite.finalize(
      publicKey,
      preparedMsg,
      Buffer.from(blindSignature, 'base64'),
      inv,
    );
    await expect(suite.verify(publicKey, signature, preparedMsg)).resolves.toBe(true);
  });

  it('rechaza si la eleccion no existe', async () => {
    const assertion = buildAssertion(config);

    await expect(
      useCase.execute('no-existe', { assertion, blindedMessage: 'Yw==' }),
    ).rejects.toBeInstanceOf(ElectionNotFoundError);
  });

  it('rechaza si la ventana de registro no esta abierta', async () => {
    const election = await electionRepository.create({
      nombre: 'Representante FICCT',
      registroInicio: new Date('2026-01-01T00:00:00Z'),
      registroFin: new Date('2026-01-10T00:00:00Z'),
      votacionInicio: new Date('2026-01-10T00:00:00Z'),
      votacionFin: new Date('2026-01-12T00:00:00Z'),
      opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      createdBy: 'admin-1',
    });
    const assertion = buildAssertion(config);

    await expect(
      useCase.execute(election.id, { assertion, blindedMessage: 'Yw==' }),
    ).rejects.toBeInstanceOf(RegistrationWindowClosedError);
  });

  it('rechaza una assertion invalida (firma alterada)', async () => {
    const election = await createOpenElection();
    const tampered = buildAssertion(config).slice(0, -4) + 'ffff';

    await expect(
      useCase.execute(election.id, { assertion: tampered, blindedMessage: 'Yw==' }),
    ).rejects.toBeInstanceOf(RegistrationInvalidAssertionError);
  });

  it('rechaza si la assertion no esta habilitada', async () => {
    const election = await createOpenElection();
    const assertion = buildAssertion(config, { habilitado: false });

    await expect(
      useCase.execute(election.id, { assertion, blindedMessage: 'Yw==' }),
    ).rejects.toBeInstanceOf(RegistrationNotEligibleError);
  });

  it('rechaza un segundo registro de la misma persona en la misma eleccion', async () => {
    const election = await createOpenElection();
    const firstAssertion = buildAssertion(config);
    await useCase.execute(election.id, { assertion: firstAssertion, blindedMessage: 'Yw==' });

    const secondAssertion = buildAssertion(config);

    await expect(
      useCase.execute(election.id, { assertion: secondAssertion, blindedMessage: 'Yw==' }),
    ).rejects.toBeInstanceOf(RegistrationAlreadyRegisteredError);
  });
});
