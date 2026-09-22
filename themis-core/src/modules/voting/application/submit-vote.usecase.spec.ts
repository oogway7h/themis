import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import { SubmitVoteUseCase } from './submit-vote.usecase';
import {
  VoteAlreadyCastError,
  VoteInvalidProofError,
  VoteOptionNotFoundError,
  VoteScopeMismatchError,
  VotingGroupNotReadyError,
  VotingWindowClosedError,
} from './voting.errors';
import { SemaphoreProofInput } from '../domain/vote-onchain.port';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryVoteSubmissionRepository } from '../../../../test/doubles/in-memory-vote-submission.repository';
import { FakeVoteOnChainService } from '../../../../test/doubles/fake-vote-onchain.service';

describe('SubmitVoteUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let voteSubmissionRepository: InMemoryVoteSubmissionRepository;
  let onChain: FakeVoteOnChainService;
  let useCase: SubmitVoteUseCase;

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

  function buildProof(overrides: Partial<SemaphoreProofInput> = {}): SemaphoreProofInput {
    return {
      merkleTreeDepth: 1,
      merkleTreeRoot: '111',
      nullifier: 'nullifier-1',
      message: '0',
      scope: 'group-1',
      points: ['1', '2', '3', '4', '5', '6', '7', '8'],
      ...overrides,
    };
  }

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    voteSubmissionRepository = new InMemoryVoteSubmissionRepository();
    onChain = new FakeVoteOnChainService();
    useCase = new SubmitVoteUseCase(electionRepository, voteSubmissionRepository, onChain);
  });

  it('rechaza una eleccion inexistente', async () => {
    await expect(useCase.execute('no-existe', buildProof())).rejects.toBeInstanceOf(
      ElectionNotFoundError,
    );
  });

  it('rechaza votar fuera de VOTACION_ABIERTA', async () => {
    const createElection = new CreateElectionUseCase(electionRepository);
    const election = await createElection.execute(
      {
        nombre: 'X',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );

    await expect(useCase.execute(election.id, buildProof())).rejects.toBeInstanceOf(
      VotingWindowClosedError,
    );
  });

  it('rechaza votar si la eleccion no tiene grupo on-chain todavia', async () => {
    const createElection = new CreateElectionUseCase(electionRepository);
    const election = await createElection.execute(
      {
        nombre: 'X',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );
    electionRepository.forceStatus(election.id, 'VOTACION_ABIERTA');

    await expect(useCase.execute(election.id, buildProof())).rejects.toBeInstanceOf(
      VotingGroupNotReadyError,
    );
  });

  it('rechaza un scope que no coincide con el grupo on-chain de la eleccion', async () => {
    const election = await createOpenElection();

    await expect(
      useCase.execute(election.id, buildProof({ scope: 'otro-grupo' })),
    ).rejects.toBeInstanceOf(VoteScopeMismatchError);
  });

  it('rechaza una opcion que no pertenece a la eleccion', async () => {
    const election = await createOpenElection();

    await expect(
      useCase.execute(election.id, buildProof({ message: '99' })),
    ).rejects.toBeInstanceOf(VoteOptionNotFoundError);
  });

  it('mapea nullifier reusado on-chain a VoteAlreadyCastError', async () => {
    const election = await createOpenElection();
    onChain.failWith = 'NULLIFIER_REUSED';

    await expect(useCase.execute(election.id, buildProof())).rejects.toBeInstanceOf(
      VoteAlreadyCastError,
    );
  });

  it('mapea prueba invalida on-chain a VoteInvalidProofError', async () => {
    const election = await createOpenElection();
    onChain.failWith = 'INVALID_PROOF';

    await expect(useCase.execute(election.id, buildProof())).rejects.toBeInstanceOf(
      VoteInvalidProofError,
    );
  });

  it('caso feliz: relaya on-chain, persiste el voto y devuelve el hash de tx', async () => {
    const election = await createOpenElection();

    const result = await useCase.execute(election.id, buildProof());

    expect(result.onChainTxHash).toBe('0xfake-vote-1');
    expect(onChain.callCount).toBe(1);
    const stored = voteSubmissionRepository.all();
    expect(stored).toHaveLength(1);
    expect(stored[0].electionId).toBe(election.id);
    expect(stored[0].optionId).toBe(election.opciones[0].id);
    expect(stored[0].source).toBe('RELAY');
  });

  it('una carrera que ya persistio el mismo nullifier no lanza error (idempotente)', async () => {
    const election = await createOpenElection();
    await voteSubmissionRepository.create({
      electionId: election.id,
      optionId: election.opciones[0].id,
      nullifier: 'nullifier-1',
      merkleTreeRoot: '111',
      scope: 'group-1',
      source: 'RELAY',
      onChainTxHash: '0xya-estaba',
      blockNumber: 1,
    });

    const result = await useCase.execute(election.id, buildProof());

    expect(result.onChainTxHash).toBe('0xfake-vote-1');
    expect(voteSubmissionRepository.all()).toHaveLength(1);
  });
});
