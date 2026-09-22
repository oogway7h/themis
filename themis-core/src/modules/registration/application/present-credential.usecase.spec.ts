import { webcrypto } from 'node:crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { PresentCredentialUseCase } from './present-credential.usecase';
import {
  CredentialAlreadyPresentedError,
  CredentialInvalidSignatureError,
  ElectionClosedError,
} from './registration.errors';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import { RegistrationSigningService } from '../infrastructure/registration-signing.service';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryPresentedCredentialRepository } from '../../../../test/doubles/in-memory-presented-credential.repository';
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

describe('PresentCredentialUseCase', () => {
  let config: AppConfig;
  let electionRepository: InMemoryElectionRepository;
  let presentedCredentialRepository: InMemoryPresentedCredentialRepository;
  let signingService: RegistrationSigningService;
  let useCase: PresentCredentialUseCase;

  beforeEach(async () => {
    config = await buildConfig();
    electionRepository = new InMemoryElectionRepository();
    presentedCredentialRepository = new InMemoryPresentedCredentialRepository();
    signingService = new RegistrationSigningService(config);
    await signingService.onModuleInit();
    useCase = new PresentCredentialUseCase(
      electionRepository,
      presentedCredentialRepository,
      signingService,
    );
  });

  async function createElection(estado: 'REGISTRO_ABIERTO' | 'CERRADA' = 'REGISTRO_ABIERTO') {
    const election = await electionRepository.create({
      nombre: 'Representante FICCT',
      registroInicio: new Date('2026-01-01T00:00:00Z'),
      registroFin: new Date('2026-01-10T00:00:00Z'),
      votacionInicio: new Date('2026-01-10T00:00:00Z'),
      votacionFin: new Date('2026-01-12T00:00:00Z'),
      opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      createdBy: 'admin-1',
    });
    electionRepository.forceStatus(election.id, estado);
    return election;
  }

  // Simula el lado cliente completo: genera commitment, ciega, "manda" al
  // backend (blindSign real), y finaliza - para tener un par
  // (preparedMessage, signature) genuinamente valido para los tests.
  async function buildValidCredential(commitment: string) {
    const suite = RSABSSA.SHA384.PSS.Randomized();
    const publicKey = await webcrypto.subtle.importKey(
      'jwk',
      JSON.parse(config.registrationSigning.publicKeyJwk),
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify'],
    );
    const preparedMsg = suite.prepare(new TextEncoder().encode(commitment));
    const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);
    const blindSignature = await signingService.blindSign(
      Buffer.from(blindedMsg).toString('base64'),
    );
    const signature = await suite.finalize(
      publicKey,
      preparedMsg,
      Buffer.from(blindSignature, 'base64'),
      inv,
    );
    return {
      preparedMessage: Buffer.from(preparedMsg).toString('base64'),
      signature: Buffer.from(signature).toString('base64'),
    };
  }

  it('acepta una credencial con firma valida y extrae el commitment real', async () => {
    const election = await createElection();
    const { preparedMessage, signature } = await buildValidCredential('commitment-real-1');

    const result = await useCase.execute(election.id, { preparedMessage, signature });

    expect(result.status).toBe('PENDING');
    expect(result.commitment).toBe('commitment-real-1');
    expect(result.electionId).toBe(election.id);
  });

  it('rechaza si la eleccion no existe', async () => {
    const { preparedMessage, signature } = await buildValidCredential('c');

    await expect(
      useCase.execute('no-existe', { preparedMessage, signature }),
    ).rejects.toBeInstanceOf(ElectionNotFoundError);
  });

  it('rechaza si la eleccion ya esta cerrada', async () => {
    const election = await createElection('CERRADA');
    const { preparedMessage, signature } = await buildValidCredential('c');

    await expect(
      useCase.execute(election.id, { preparedMessage, signature }),
    ).rejects.toBeInstanceOf(ElectionClosedError);
  });

  it('rechaza una firma invalida', async () => {
    const election = await createElection();
    const { preparedMessage } = await buildValidCredential('c');

    await expect(
      useCase.execute(election.id, {
        preparedMessage,
        signature: Buffer.from('firma-inventada').toString('base64'),
      }),
    ).rejects.toBeInstanceOf(CredentialInvalidSignatureError);
  });

  it('rechaza presentar el mismo commitment dos veces', async () => {
    const election = await createElection();
    const credentialA = await buildValidCredential('commitment-repetido');
    await useCase.execute(election.id, credentialA);

    // Segunda credencial distinta (otro cegado), pero para el MISMO commitment.
    const credentialB = await buildValidCredential('commitment-repetido');

    await expect(useCase.execute(election.id, credentialB)).rejects.toBeInstanceOf(
      CredentialAlreadyPresentedError,
    );
  });
});
