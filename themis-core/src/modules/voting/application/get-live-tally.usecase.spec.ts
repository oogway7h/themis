import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import { GetLiveTallyUseCase } from './get-live-tally.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryVoteSubmissionRepository } from '../../../../test/doubles/in-memory-vote-submission.repository';

describe('GetLiveTallyUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let voteSubmissionRepository: InMemoryVoteSubmissionRepository;
  let useCase: GetLiveTallyUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    voteSubmissionRepository = new InMemoryVoteSubmissionRepository();
    useCase = new GetLiveTallyUseCase(electionRepository, voteSubmissionRepository);
  });

  it('rechaza una eleccion inexistente', async () => {
    await expect(useCase.execute('no-existe')).rejects.toBeInstanceOf(ElectionNotFoundError);
  });

  it('cuenta votos por opcion, incluidas opciones sin ningun voto todavia', async () => {
    const createElection = new CreateElectionUseCase(electionRepository);
    const election = await createElection.execute(
      {
        nombre: 'Representante FICCT',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'Candidata A' }, { nombre: 'Candidato B' }],
      },
      'admin-1',
    );
    electionRepository.forceStatus(election.id, 'VOTACION_ABIERTA');

    const [optionA, optionB] = election.opciones;
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: optionA.id,
      nullifier: 'n1',
      merkleTreeRoot: 'r',
      scope: 'group-1',
      source: 'RELAY',
      onChainTxHash: '0x1',
      blockNumber: 1,
    });
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: optionA.id,
      nullifier: 'n2',
      merkleTreeRoot: 'r',
      scope: 'group-1',
      source: 'CHAIN_SYNC',
      onChainTxHash: '0x2',
      blockNumber: 2,
    });

    const tally = await useCase.execute(election.id);

    expect(tally.estado).toBe('VOTACION_ABIERTA');
    expect(tally.totalVotes).toBe(2);
    expect(tally.opciones).toEqual([
      { optionId: optionA.id, nombre: 'Candidata A', voteCount: 2 },
      { optionId: optionB.id, nombre: 'Candidato B', voteCount: 0 },
    ]);
  });
});
