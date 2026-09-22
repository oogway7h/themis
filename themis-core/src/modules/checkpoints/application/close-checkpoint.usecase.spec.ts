import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { CloseCheckpointUseCase } from './close-checkpoint.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryPresentedCredentialRepository } from '../../../../test/doubles/in-memory-presented-credential.repository';
import { InMemoryRegistrationBatchRepository } from '../../../../test/doubles/in-memory-registration-batch.repository';

describe('CloseCheckpointUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let credentialRepository: InMemoryPresentedCredentialRepository;
  let batchRepository: InMemoryRegistrationBatchRepository;
  let createElectionUseCase: CreateElectionUseCase;
  let useCase: CloseCheckpointUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    credentialRepository = new InMemoryPresentedCredentialRepository();
    batchRepository = new InMemoryRegistrationBatchRepository(credentialRepository);
    createElectionUseCase = new CreateElectionUseCase(electionRepository);
    useCase = new CloseCheckpointUseCase(electionRepository, credentialRepository, batchRepository);
  });

  async function createElection() {
    return createElectionUseCase.execute(
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
  }

  it('crea un lote con las credenciales PENDING y las pasa a BATCHED (AC-01)', async () => {
    const election = await createElection();
    await credentialRepository.create({
      electionId: election.id,
      commitment: 'c1',
      preparedMessage: 'm1',
      signature: 's1',
    });
    await credentialRepository.create({
      electionId: election.id,
      commitment: 'c2',
      preparedMessage: 'm2',
      signature: 's2',
    });

    const batch = await useCase.execute(election.id, new Date('2026-01-02T00:00:00Z'));

    expect(batch).not.toBeNull();
    expect(batch?.credentialCount).toBe(2);
    expect(batch?.status).toBe('PENDING_APPROVAL');
    expect(batch?.approvalsRequired).toBe(3);

    const pending = await credentialRepository.findPendingByElection(election.id);
    expect(pending).toHaveLength(0);
    const batched = await credentialRepository.findByBatch(batch!.id);
    expect(batched).toHaveLength(2);
  });

  it('no crea lote si no hay credenciales pendientes, pero igual cierra la ventana (AC-02)', async () => {
    const election = await createElection();

    const batch = await useCase.execute(election.id, new Date('2026-01-02T00:00:00Z'));

    expect(batch).toBeNull();
    const updated = await electionRepository.findById(election.id);
    expect(updated?.lastCheckpointClosedAt).not.toBeNull();
  });

  it('un segundo cierre antes de que avance dueAt es un no-op (AC-03)', async () => {
    const election = await createElection();
    const dueAt = new Date('2026-01-02T00:00:00Z');
    await useCase.execute(election.id, dueAt);
    await credentialRepository.create({
      electionId: election.id,
      commitment: 'c1',
      preparedMessage: 'm1',
      signature: 's1',
    });

    const secondBatch = await useCase.execute(election.id, dueAt);

    expect(secondBatch).toBeNull();
    const pending = await credentialRepository.findPendingByElection(election.id);
    expect(pending).toHaveLength(1);
  });
});
