import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { CloseCheckpointUseCase } from './close-checkpoint.usecase';
import { CloseDueCheckpointsUseCase } from './close-due-checkpoints.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryPresentedCredentialRepository } from '../../../../test/doubles/in-memory-presented-credential.repository';
import { InMemoryRegistrationBatchRepository } from '../../../../test/doubles/in-memory-registration-batch.repository';

describe('CloseDueCheckpointsUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let credentialRepository: InMemoryPresentedCredentialRepository;
  let batchRepository: InMemoryRegistrationBatchRepository;
  let useCase: CloseDueCheckpointsUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    credentialRepository = new InMemoryPresentedCredentialRepository();
    batchRepository = new InMemoryRegistrationBatchRepository(credentialRepository);
    const closeCheckpoint = new CloseCheckpointUseCase(
      electionRepository,
      credentialRepository,
      batchRepository,
    );
    useCase = new CloseDueCheckpointsUseCase(electionRepository, closeCheckpoint);
  });

  async function createElection(nombre: string) {
    const create = new CreateElectionUseCase(electionRepository);
    return create.execute(
      {
        nombre,
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );
  }

  it('solo cierra elecciones REGISTRO_ABIERTO cuyo checkpoint ya vencio (AC-01)', async () => {
    const dueElection = await createElection('Vencida');
    electionRepository.forceStatus(dueElection.id, 'REGISTRO_ABIERTO');
    electionRepository.forceLastCheckpointClosedAt(
      dueElection.id,
      new Date(Date.now() - 2 * 60 * 60_000),
    );
    await credentialRepository.create({
      electionId: dueElection.id,
      commitment: 'c1',
      preparedMessage: 'm1',
      signature: 's1',
    });

    const notDueElection = await createElection('Recien cerrada');
    electionRepository.forceStatus(notDueElection.id, 'REGISTRO_ABIERTO');
    electionRepository.forceLastCheckpointClosedAt(notDueElection.id, new Date());
    await credentialRepository.create({
      electionId: notDueElection.id,
      commitment: 'c2',
      preparedMessage: 'm2',
      signature: 's2',
    });

    const draftElection = await createElection('Borrador');
    await credentialRepository.create({
      electionId: draftElection.id,
      commitment: 'c3',
      preparedMessage: 'm3',
      signature: 's3',
    });

    await useCase.execute();

    expect(await batchRepository.findByElection(dueElection.id)).toHaveLength(1);
    expect(await batchRepository.findByElection(notDueElection.id)).toHaveLength(0);
    expect(await batchRepository.findByElection(draftElection.id)).toHaveLength(0);
  });

  it('en REGISTRO_CERRADO cierra un unico checkpoint final con lo que quedo pendiente', async () => {
    const election = await createElection('Registro cerrado');
    electionRepository.forceStatus(election.id, 'REGISTRO_CERRADO');
    // ultimo checkpoint normal, antes de registroFin y con el intervalo aun sin vencer
    electionRepository.forceLastCheckpointClosedAt(election.id, new Date('2026-01-09T23:30:00Z'));
    await credentialRepository.create({
      electionId: election.id,
      commitment: 'tarde-1',
      preparedMessage: 'm',
      signature: 's',
    });

    await useCase.execute();
    expect(await batchRepository.findByElection(election.id)).toHaveLength(1);

    await credentialRepository.create({
      electionId: election.id,
      commitment: 'tarde-2',
      preparedMessage: 'm',
      signature: 's',
    });
    await useCase.execute();
    expect(await batchRepository.findByElection(election.id)).toHaveLength(1);
  });
});
