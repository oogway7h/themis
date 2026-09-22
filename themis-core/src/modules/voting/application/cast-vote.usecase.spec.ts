import { CastVoteUseCase } from './cast-vote.usecase';
import {
  ElectionNotFoundError,
  ElectionNotOpenForVotingError,
  OptionNotFoundError,
  DuplicateVoteError,
} from '../domain/voting.errors';
import type {
  VotingRepository,
  PublicElectionDetail,
  CreateVoteReceiptData,
} from '../domain/voting.repository';
import type { VoteReceiptEntity } from '../domain/vote-receipt.entity';
import type {
  VotingOnChainService,
  OnChainVoteProof,
  CastVoteOnChainResult,
} from '../infrastructure/voting-onchain.service';

class MockVotingRepository implements VotingRepository {
  public elections: PublicElectionDetail[] = [];
  public receipts: VoteReceiptEntity[] = [];
  public commitments: Record<string, string[]> = {};

  async findPublicActiveElections(): Promise<PublicElectionDetail[]> {
    return this.elections.filter((e) => e.estado === 'VOTACION_ABIERTA');
  }

  async findPublicElectionById(id: string): Promise<PublicElectionDetail | null> {
    return this.elections.find((e) => e.id === id) ?? null;
  }

  async findVoteReceiptByNullifier(
    nullifier: string,
  ): Promise<VoteReceiptEntity | null> {
    return this.receipts.find((r) => r.nullifier === nullifier) ?? null;
  }

  async saveVoteReceipt(data: CreateVoteReceiptData): Promise<VoteReceiptEntity> {
    const receipt: VoteReceiptEntity = {
      id: 'receipt-123',
      electionId: data.electionId,
      optionId: data.optionId,
      nullifier: data.nullifier,
      txHash: data.txHash,
      createdAt: new Date(),
    };
    this.receipts.push(receipt);
    return receipt;
  }

  async findInsertedCommitmentsByElectionId(
    electionId: string,
  ): Promise<string[]> {
    return this.commitments[electionId] ?? [];
  }

  public votedTokens: Set<string> = new Set();
  public registeredTokens: Set<string> = new Set();

  async markVoterHasVoted(electionId: string, scopedTokenHash: string): Promise<void> {
    this.votedTokens.add(`${electionId}:${scopedTokenHash}`);
  }

  async hasVoterVoted(electionId: string, scopedTokenHash: string): Promise<boolean> {
    return this.votedTokens.has(`${electionId}:${scopedTokenHash}`);
  }

  async isVoterRegistered(electionId: string, scopedTokenHash: string): Promise<boolean> {
    return this.registeredTokens.has(`${electionId}:${scopedTokenHash}`);
  }
}

class MockVotingOnChainService implements Partial<VotingOnChainService> {
  async castVote(
    _groupId: string,
    _proof: OnChainVoteProof,
  ): Promise<CastVoteOnChainResult> {
    return {
      txHash: '0xmocktxhash1234567890abcdef',
      blockNumber: 42,
    };
  }
}

describe('CastVoteUseCase', () => {
  let repository: MockVotingRepository;
  let onChainService: MockVotingOnChainService;
  let useCase: CastVoteUseCase;

  const sampleProof: OnChainVoteProof = {
    merkleTreeDepth: 16,
    merkleTreeRoot: '12345',
    nullifier: 'nullifier-abc-999',
    message: '1',
    scope: '100',
    points: ['1', '2', '3', '4', '5', '6', '7', '8'],
  };

  beforeEach(() => {
    repository = new MockVotingRepository();
    onChainService = new MockVotingOnChainService();
    useCase = new CastVoteUseCase(
      repository,
      onChainService as unknown as VotingOnChainService,
    );
  });

  it('debe registrar el voto exitosamente cuando la elección está abierta y la prueba es válida', async () => {
    repository.elections.push({
      id: 'election-1',
      nombre: 'Elección Rectorado',
      descripcion: 'Elección anual',
      estado: 'VOTACION_ABIERTA',
      votacionInicio: new Date(),
      votacionFin: new Date(Date.now() + 86400000),
      onChainGroupId: '100',
      merkleRoot: '12345',
      opciones: [
        {
          id: 'option-1',
          nombre: 'Frente A',
          descripcion: null,
          onChainIndex: 1,
        },
      ],
    });

    const receipt = await useCase.execute({
      electionId: 'election-1',
      optionId: 'option-1',
      proof: sampleProof,
    });

    expect(receipt).toBeDefined();
    expect(receipt.txHash).toBe('0xmocktxhash1234567890abcdef');
    expect(receipt.nullifier).toBe('nullifier-abc-999');
    expect(repository.receipts).toHaveLength(1);
  });

  it('debe fallar con ElectionNotFoundError si la elección no existe', async () => {
    await expect(
      useCase.execute({
        electionId: 'non-existent',
        optionId: 'option-1',
        proof: sampleProof,
      }),
    ).rejects.toThrow(ElectionNotFoundError);
  });

  it('debe fallar con ElectionNotOpenForVotingError si la elección no está en VOTACION_ABIERTA', async () => {
    repository.elections.push({
      id: 'election-1',
      nombre: 'Elección Borrador',
      descripcion: null,
      estado: 'REGISTRO_ABIERTO',
      votacionInicio: new Date(),
      votacionFin: new Date(Date.now() + 86400000),
      onChainGroupId: '100',
      merkleRoot: null,
      opciones: [{ id: 'opt-1', nombre: 'Opt 1', descripcion: null, onChainIndex: 1 }],
    });

    await expect(
      useCase.execute({
        electionId: 'election-1',
        optionId: 'opt-1',
        proof: sampleProof,
      }),
    ).rejects.toThrow(ElectionNotOpenForVotingError);
  });

  it('debe fallar con OptionNotFoundError si la opción votada no pertenece a la elección', async () => {
    repository.elections.push({
      id: 'election-1',
      nombre: 'Elección Rectorado',
      descripcion: null,
      estado: 'VOTACION_ABIERTA',
      votacionInicio: new Date(),
      votacionFin: new Date(),
      onChainGroupId: '100',
      merkleRoot: null,
      opciones: [{ id: 'opt-1', nombre: 'Opt 1', descripcion: null, onChainIndex: 1 }],
    });

    await expect(
      useCase.execute({
        electionId: 'election-1',
        optionId: 'non-existent-option',
        proof: sampleProof,
      }),
    ).rejects.toThrow(OptionNotFoundError);
  });

  it('debe fallar con DuplicateVoteError si el nullifier ya fue registrado', async () => {
    repository.elections.push({
      id: 'election-1',
      nombre: 'Elección Rectorado',
      descripcion: null,
      estado: 'VOTACION_ABIERTA',
      votacionInicio: new Date(),
      votacionFin: new Date(),
      onChainGroupId: '100',
      merkleRoot: null,
      opciones: [{ id: 'opt-1', nombre: 'Opt 1', descripcion: null, onChainIndex: 1 }],
    });

    repository.receipts.push({
      id: 'existing-receipt',
      electionId: 'election-1',
      optionId: 'opt-1',
      nullifier: 'nullifier-abc-999',
      txHash: '0xprior',
      createdAt: new Date(),
    });

    await expect(
      useCase.execute({
        electionId: 'election-1',
        optionId: 'opt-1',
        proof: sampleProof,
      }),
    ).rejects.toThrow(DuplicateVoteError);
  });
});
