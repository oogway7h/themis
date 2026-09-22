import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { ExecuteFinalCountUseCase } from './execute-final-count.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryVoteSubmissionRepository } from '../../../../test/doubles/in-memory-vote-submission.repository';
import { InMemoryChainSyncStateRepository } from '../../../../test/doubles/in-memory-chain-sync-state.repository';
import { InMemoryElectionResultRepository } from '../../../../test/doubles/in-memory-election-result.repository';

describe('ExecuteFinalCountUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let voteSubmissionRepository: InMemoryVoteSubmissionRepository;
  let chainSyncStateRepository: InMemoryChainSyncStateRepository;
  let electionResultRepository: InMemoryElectionResultRepository;
  let useCase: ExecuteFinalCountUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    voteSubmissionRepository = new InMemoryVoteSubmissionRepository();
    chainSyncStateRepository = new InMemoryChainSyncStateRepository();
    electionResultRepository = new InMemoryElectionResultRepository();
    useCase = new ExecuteFinalCountUseCase(
      electionRepository,
      voteSubmissionRepository,
      chainSyncStateRepository,
      electionResultRepository,
    );
  });

  async function createClosedElectionWithVotes() {
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
    await electionRepository.setOnChainGroup(election.id, 'group-1');
    await electionRepository.setMerkleRoot(election.id, 'root-final');
    await chainSyncStateRepository.upsert(election.id, 42);
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: election.opciones[0].id,
      nullifier: 'n1',
      merkleTreeRoot: 'root-final',
      scope: 'group-1',
      source: 'RELAY',
      onChainTxHash: '0x1',
      blockNumber: 10,
    });
    electionRepository.forceStatus(election.id, 'CERRADA');
    return (await electionRepository.findById(election.id))!;
  }

  it('no toca elecciones que no estan CERRADA', async () => {
    const createElection = new CreateElectionUseCase(electionRepository);
    await createElection.execute(
      {
        nombre: 'Abierta',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );

    await useCase.execute();

    expect(electionResultRepository).toBeDefined();
  });

  it('calcula y persiste el snapshot inmutable del conteo final', async () => {
    const election = await createClosedElectionWithVotes();

    await useCase.execute();

    const result = await electionResultRepository.findByElection(election.id);
    expect(result).not.toBeNull();
    expect(result?.totalVotes).toBe(1);
    expect(result?.finalMerkleRoot).toBe('root-final');
    expect(result?.sourceBlockNumber).toBe(42);
    expect(result?.opciones).toEqual([{ optionId: election.opciones[0].id, voteCount: 1 }]);
  });

  it('es idempotente: una segunda corrida no recalcula ni lanza error', async () => {
    const election = await createClosedElectionWithVotes();
    await useCase.execute();
    const firstResult = await electionResultRepository.findByElection(election.id);

    // Un voto adicional despues del snapshot no deberia cambiarlo.
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: election.opciones[1].id,
      nullifier: 'n2',
      merkleTreeRoot: 'root-final',
      scope: 'group-1',
      source: 'CHAIN_SYNC',
      onChainTxHash: '0x2',
      blockNumber: 11,
    });

    await expect(useCase.execute()).resolves.toBeUndefined();
    const secondResult = await electionResultRepository.findByElection(election.id);
    expect(secondResult?.totalVotes).toBe(firstResult?.totalVotes);
  });
});
