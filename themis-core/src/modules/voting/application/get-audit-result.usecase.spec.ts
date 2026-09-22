import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import { GetAuditResultUseCase } from './get-audit-result.usecase';
import { GetLiveTallyUseCase } from './get-live-tally.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryVoteSubmissionRepository } from '../../../../test/doubles/in-memory-vote-submission.repository';
import { InMemoryChainSyncStateRepository } from '../../../../test/doubles/in-memory-chain-sync-state.repository';
import { InMemoryElectionResultRepository } from '../../../../test/doubles/in-memory-election-result.repository';

describe('GetAuditResultUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let voteSubmissionRepository: InMemoryVoteSubmissionRepository;
  let chainSyncStateRepository: InMemoryChainSyncStateRepository;
  let electionResultRepository: InMemoryElectionResultRepository;
  let useCase: GetAuditResultUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    voteSubmissionRepository = new InMemoryVoteSubmissionRepository();
    chainSyncStateRepository = new InMemoryChainSyncStateRepository();
    electionResultRepository = new InMemoryElectionResultRepository();
    useCase = new GetAuditResultUseCase(
      electionRepository,
      voteSubmissionRepository,
      chainSyncStateRepository,
      electionResultRepository,
      new GetLiveTallyUseCase(electionRepository, voteSubmissionRepository),
    );
  });

  it('rechaza una eleccion inexistente', async () => {
    await expect(useCase.execute('no-existe')).rejects.toBeInstanceOf(ElectionNotFoundError);
  });

  it('antes del cierre: result es null pero liveTally y el desglose por fuente ya estan disponibles', async () => {
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
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: election.opciones[0].id,
      nullifier: 'n1',
      merkleTreeRoot: 'r',
      scope: 'group-1',
      source: 'RELAY',
      onChainTxHash: '0x1',
      blockNumber: 1,
    });
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: election.opciones[0].id,
      nullifier: 'n2',
      merkleTreeRoot: 'r',
      scope: 'group-1',
      source: 'CHAIN_SYNC',
      onChainTxHash: '0x2',
      blockNumber: 2,
    });

    const audit = await useCase.execute(election.id);

    expect(audit.result).toBeNull();
    expect(audit.chainSync).toBeNull();
    expect(audit.liveTally.find((o) => o.optionId === election.opciones[0].id)?.voteCount).toBe(2);
    expect(audit.voteSubmissionCounts).toEqual({ total: 2, relay: 1, chainSync: 1 });
  });

  it('despues del cierre: expone el resultado final inmutable y el estado de sincronizacion', async () => {
    const createElection = new CreateElectionUseCase(electionRepository);
    const election = await createElection.execute(
      {
        nombre: 'Cerrada',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );
    electionRepository.forceStatus(election.id, 'CERRADA');
    await chainSyncStateRepository.upsert(election.id, 77);
    await electionResultRepository.create({
      electionId: election.id,
      totalVotes: 5,
      finalMerkleRoot: 'root-x',
      sourceBlockNumber: 77,
      opciones: [{ optionId: election.opciones[0].id, voteCount: 5 }],
    });

    const audit = await useCase.execute(election.id);

    expect(audit.result?.totalVotes).toBe(5);
    expect(audit.result?.finalMerkleRoot).toBe('root-x');
    expect(audit.chainSync?.lastSyncedBlock).toBe(77);
  });
});
