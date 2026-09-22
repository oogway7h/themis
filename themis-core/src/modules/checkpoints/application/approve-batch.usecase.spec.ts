import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { DesignateAuthoritiesUseCase } from '../../elections/application/designate-authorities.usecase';
import { ApproveBatchUseCase } from './approve-batch.usecase';
import { CloseCheckpointUseCase } from './close-checkpoint.usecase';
import {
  AuthorityNotDesignatedForElectionError,
  BatchAlreadyApprovedByAuthorityError,
  BatchNotPendingApprovalError,
} from './checkpoint.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryAuthorityRepository } from '../../../../test/doubles/in-memory-authority.repository';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';
import { InMemoryPresentedCredentialRepository } from '../../../../test/doubles/in-memory-presented-credential.repository';
import { InMemoryRegistrationBatchRepository } from '../../../../test/doubles/in-memory-registration-batch.repository';
import { InMemoryBatchApprovalRepository } from '../../../../test/doubles/in-memory-batch-approval.repository';
import { FakeSemaphoreOnChainService } from '../../../../test/doubles/fake-semaphore-onchain.service';
import { Authority } from '../../elections/domain/authority.entity';

describe('ApproveBatchUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let authorityRepository: InMemoryAuthorityRepository;
  let platformUserRepository: InMemoryPlatformUserRepository;
  let credentialRepository: InMemoryPresentedCredentialRepository;
  let batchRepository: InMemoryRegistrationBatchRepository;
  let approvalRepository: InMemoryBatchApprovalRepository;
  let onChain: FakeSemaphoreOnChainService;
  let useCase: ApproveBatchUseCase;

  async function setupElectionWithBatch() {
    const createElection = new CreateElectionUseCase(electionRepository);
    const election = await createElection.execute(
      {
        nombre: 'Representante FICCT',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );

    const accounts = [];
    for (let i = 1; i <= 5; i += 1) {
      accounts.push(
        await platformUserRepository.create({
          email: `autoridad${i}@themis.dev`,
          passwordHash: 'hash',
          nombreCompleto: `Autoridad ${i}`,
          role: 'AUTORIDAD_REGISTRO',
        }),
      );
    }

    const designate = new DesignateAuthoritiesUseCase(
      electionRepository,
      authorityRepository,
      platformUserRepository,
    );
    const authorities: Authority[] = await designate.execute(
      election.id,
      accounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Docente' })),
      'admin-1',
    );

    await credentialRepository.create({
      electionId: election.id,
      commitment: 'c1',
      preparedMessage: 'm1',
      signature: 's1',
    });

    const closeCheckpoint = new CloseCheckpointUseCase(
      electionRepository,
      credentialRepository,
      batchRepository,
    );
    const batch = await closeCheckpoint.execute(election.id, new Date('2026-01-02T00:00:00Z'));

    return { election, authorities, batch: batch! };
  }

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    authorityRepository = new InMemoryAuthorityRepository();
    platformUserRepository = new InMemoryPlatformUserRepository();
    credentialRepository = new InMemoryPresentedCredentialRepository();
    batchRepository = new InMemoryRegistrationBatchRepository(credentialRepository);
    approvalRepository = new InMemoryBatchApprovalRepository();
    onChain = new FakeSemaphoreOnChainService();
    useCase = new ApproveBatchUseCase(
      batchRepository,
      approvalRepository,
      authorityRepository,
      electionRepository,
      credentialRepository,
      onChain,
    );
  });

  it('una aprobacion parcial no dispara insercion on-chain (AC-01, AC-03)', async () => {
    const { election, authorities, batch } = await setupElectionWithBatch();

    const result = await useCase.execute(election.id, batch.id, authorities[0].platformUserId);

    expect(result.status).toBe('PENDING_APPROVAL');
    expect(onChain.callCount).toBe(0);
  });

  it('la 3ra aprobacion dispara la insercion exactamente una vez (AC-02)', async () => {
    const { election, authorities, batch } = await setupElectionWithBatch();

    await useCase.execute(election.id, batch.id, authorities[0].platformUserId);
    await useCase.execute(election.id, batch.id, authorities[1].platformUserId);
    const result = await useCase.execute(election.id, batch.id, authorities[2].platformUserId);

    expect(result.status).toBe('INSERTED');
    expect(result.merkleRootAfter).toBe('fake-root-1');
    expect(onChain.callCount).toBe(1);

    const insertedCredentials = await credentialRepository.findByBatch(batch.id);
    expect(insertedCredentials.every((credential) => credential.status === 'INSERTED')).toBe(true);
    const updatedElection = await electionRepository.findById(election.id);
    expect(updatedElection?.merkleRoot).toBe('fake-root-1');
  });

  it('la misma autoridad no puede aprobar dos veces el mismo lote (AC-04)', async () => {
    const { election, authorities, batch } = await setupElectionWithBatch();
    await useCase.execute(election.id, batch.id, authorities[0].platformUserId);

    await expect(
      useCase.execute(election.id, batch.id, authorities[0].platformUserId),
    ).rejects.toBeInstanceOf(BatchAlreadyApprovedByAuthorityError);
  });

  it('rechaza a una cuenta que no esta designada como autoridad en esta eleccion (AC-05)', async () => {
    const { election, batch } = await setupElectionWithBatch();

    await expect(
      useCase.execute(election.id, batch.id, 'platform-user-inexistente'),
    ).rejects.toBeInstanceOf(AuthorityNotDesignatedForElectionError);
  });

  it('rechaza aprobar un lote que ya no esta PENDING_APPROVAL (AC-06)', async () => {
    const { election, authorities, batch } = await setupElectionWithBatch();
    await useCase.execute(election.id, batch.id, authorities[0].platformUserId);
    await useCase.execute(election.id, batch.id, authorities[1].platformUserId);
    await useCase.execute(election.id, batch.id, authorities[2].platformUserId);

    await expect(
      useCase.execute(election.id, batch.id, authorities[3].platformUserId),
    ).rejects.toBeInstanceOf(BatchNotPendingApprovalError);
  });

  it('si la insercion on-chain falla, el lote queda INSERTION_FAILED sin lanzar al caller (AC-07)', async () => {
    const { election, authorities, batch } = await setupElectionWithBatch();
    onChain.shouldFail = true;

    await useCase.execute(election.id, batch.id, authorities[0].platformUserId);
    await useCase.execute(election.id, batch.id, authorities[1].platformUserId);
    const result = await useCase.execute(election.id, batch.id, authorities[2].platformUserId);

    expect(result.status).toBe('INSERTION_FAILED');
    expect(result.failureReason).toContain('fake on-chain failure');
  });
});
