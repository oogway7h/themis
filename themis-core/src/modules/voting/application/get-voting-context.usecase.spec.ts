import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import { GetVotingContextUseCase } from './get-voting-context.usecase';
import { VotingGroupNotReadyError } from './voting.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryRegistrationBatchRepository } from '../../../../test/doubles/in-memory-registration-batch.repository';
import { InMemoryPresentedCredentialRepository } from '../../../../test/doubles/in-memory-presented-credential.repository';

describe('GetVotingContextUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let credentialRepository: InMemoryPresentedCredentialRepository;
  let batchRepository: InMemoryRegistrationBatchRepository;
  let useCase: GetVotingContextUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    credentialRepository = new InMemoryPresentedCredentialRepository();
    batchRepository = new InMemoryRegistrationBatchRepository(credentialRepository);
    useCase = new GetVotingContextUseCase(electionRepository, batchRepository);
  });

  async function createElection() {
    const createElection = new CreateElectionUseCase(electionRepository);
    return createElection.execute(
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

  it('rechaza una eleccion inexistente', async () => {
    await expect(useCase.execute('no-existe')).rejects.toBeInstanceOf(ElectionNotFoundError);
  });

  it('rechaza si la eleccion todavia no tiene grupo on-chain', async () => {
    const election = await createElection();
    await expect(useCase.execute(election.id)).rejects.toBeInstanceOf(VotingGroupNotReadyError);
  });

  it('concatena los commitments de los lotes INSERTED en orden de insercion, ignorando lotes no insertados', async () => {
    const election = await createElection();
    await electionRepository.setOnChainGroup(election.id, 'group-1');

    const batchA = await batchRepository.create({
      electionId: election.id,
      approvalsRequired: 3,
      merkleRootBefore: null,
      credentialIds: [],
    });
    await batchRepository.markInserted(batchA.id, {
      merkleRootAfter: 'root-1',
      onChainTxHash: '0xa',
      onChainGroupId: 'group-1',
      onChainMemberCommitments: ['c1', 'c2'],
    });

    const batchB = await batchRepository.create({
      electionId: election.id,
      approvalsRequired: 3,
      merkleRootBefore: 'root-1',
      credentialIds: [],
    });
    await batchRepository.markInserted(batchB.id, {
      merkleRootAfter: 'root-2',
      onChainTxHash: '0xb',
      onChainGroupId: 'group-1',
      onChainMemberCommitments: ['c3'],
    });

    // Lote pendiente de aprobacion: no debe aparecer en members.
    await batchRepository.create({
      electionId: election.id,
      approvalsRequired: 3,
      merkleRootBefore: 'root-2',
      credentialIds: [],
    });

    const context = await useCase.execute(election.id);

    expect(context.onChainGroupId).toBe('group-1');
    expect(context.members).toEqual(['c1', 'c2', 'c3']);
    expect(context.options).toEqual([
      { id: election.opciones[0].id, onChainIndex: 0 },
      { id: election.opciones[1].id, onChainIndex: 1 },
    ]);
  });
});
