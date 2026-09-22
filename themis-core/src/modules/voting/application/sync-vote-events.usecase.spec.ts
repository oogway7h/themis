import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { SyncVoteEventsUseCase } from './sync-vote-events.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryVoteSubmissionRepository } from '../../../../test/doubles/in-memory-vote-submission.repository';
import { InMemoryChainSyncStateRepository } from '../../../../test/doubles/in-memory-chain-sync-state.repository';
import { FakeVoteOnChainService } from '../../../../test/doubles/fake-vote-onchain.service';

describe('SyncVoteEventsUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let voteSubmissionRepository: InMemoryVoteSubmissionRepository;
  let chainSyncStateRepository: InMemoryChainSyncStateRepository;
  let onChain: FakeVoteOnChainService;
  let useCase: SyncVoteEventsUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    voteSubmissionRepository = new InMemoryVoteSubmissionRepository();
    chainSyncStateRepository = new InMemoryChainSyncStateRepository();
    onChain = new FakeVoteOnChainService();
    useCase = new SyncVoteEventsUseCase(
      electionRepository,
      voteSubmissionRepository,
      chainSyncStateRepository,
      onChain,
    );
  });

  async function createOpenElection() {
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
    electionRepository.forceStatus(election.id, 'VOTACION_ABIERTA');
    await electionRepository.setOnChainGroup(election.id, 'group-1');
    return (await electionRepository.findById(election.id))!;
  }

  it('ignora elecciones sin grupo on-chain todavia', async () => {
    const createElection = new CreateElectionUseCase(electionRepository);
    await createElection.execute(
      {
        nombre: 'Sin grupo',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );

    await expect(useCase.execute()).resolves.toBeUndefined();
  });

  it('sincroniza eventos nuevos y avanza el cursor', async () => {
    const election = await createOpenElection();
    onChain.currentBlock = 50;
    onChain.eventsToReturn = [
      {
        nullifier: 'n1',
        message: '0',
        merkleTreeRoot: 'root',
        scope: 'group-1',
        blockNumber: 10,
        txHash: '0xa',
      },
      {
        nullifier: 'n2',
        message: '1',
        merkleTreeRoot: 'root',
        scope: 'group-1',
        blockNumber: 20,
        txHash: '0xb',
      },
    ];

    await useCase.execute();

    const stored = voteSubmissionRepository.all();
    expect(stored).toHaveLength(2);
    expect(stored.every((row) => row.source === 'CHAIN_SYNC')).toBe(true);
    const syncState = await chainSyncStateRepository.findByElection(election.id);
    expect(syncState?.lastSyncedBlock).toBe(50);
  });

  it('no duplica un voto ya persistido por el relay sincrono (mismo nullifier)', async () => {
    const election = await createOpenElection();
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: election.opciones[0].id,
      nullifier: 'n1',
      merkleTreeRoot: 'root',
      scope: 'group-1',
      source: 'RELAY',
      onChainTxHash: '0xrelay',
      blockNumber: 5,
    });
    onChain.currentBlock = 50;
    onChain.eventsToReturn = [
      {
        nullifier: 'n1',
        message: '0',
        merkleTreeRoot: 'root',
        scope: 'group-1',
        blockNumber: 5,
        txHash: '0xrelay',
      },
      {
        nullifier: 'n2',
        message: '1',
        merkleTreeRoot: 'root',
        scope: 'group-1',
        blockNumber: 20,
        txHash: '0xb',
      },
    ];

    await useCase.execute();

    const stored = voteSubmissionRepository.all();
    expect(stored).toHaveLength(2);
    expect(stored.find((row) => row.nullifier === 'n1')?.source).toBe('RELAY');
  });

  it('ignora eventos cuyo message no coincide con ninguna opcion', async () => {
    const election = await createOpenElection();
    onChain.currentBlock = 50;
    onChain.eventsToReturn = [
      {
        nullifier: 'n1',
        message: '99',
        merkleTreeRoot: 'root',
        scope: 'group-1',
        blockNumber: 10,
        txHash: '0xa',
      },
    ];

    await expect(useCase.execute()).resolves.toBeUndefined();
    expect(voteSubmissionRepository.all()).toHaveLength(0);
    const syncState = await chainSyncStateRepository.findByElection(election.id);
    expect(syncState?.lastSyncedBlock).toBe(50);
  });
});
