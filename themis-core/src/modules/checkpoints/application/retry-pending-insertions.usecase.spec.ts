import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { CloseCheckpointUseCase } from './close-checkpoint.usecase';
import { RetryPendingInsertionsUseCase } from './retry-pending-insertions.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryPresentedCredentialRepository } from '../../../../test/doubles/in-memory-presented-credential.repository';
import { InMemoryRegistrationBatchRepository } from '../../../../test/doubles/in-memory-registration-batch.repository';
import { FakeSemaphoreOnChainService } from '../../../../test/doubles/fake-semaphore-onchain.service';

describe('RetryPendingInsertionsUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let credentialRepository: InMemoryPresentedCredentialRepository;
  let batchRepository: InMemoryRegistrationBatchRepository;
  let onChain: FakeSemaphoreOnChainService;
  let useCase: RetryPendingInsertionsUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    credentialRepository = new InMemoryPresentedCredentialRepository();
    batchRepository = new InMemoryRegistrationBatchRepository(credentialRepository);
    onChain = new FakeSemaphoreOnChainService();
    useCase = new RetryPendingInsertionsUseCase(
      batchRepository,
      credentialRepository,
      electionRepository,
      onChain,
    );
  });

  it('reintenta un lote INSERTION_FAILED y lo deja INSERTED cuando el chain ya responde (AC-01)', async () => {
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
    await batchRepository.markInsertionFailed(batch!.id, 'fallo previo simulado');

    await useCase.execute();

    const updated = await batchRepository.findById(batch!.id);
    expect(updated?.status).toBe('INSERTED');
    expect(updated?.failureReason).toBeNull();
    expect(onChain.callCount).toBe(1);
  });
});
