import type {
  CreateVoteReceiptData,
  PublicElectionDetail,
  VotingRepository,
} from '../../src/modules/voting/domain/voting.repository';
import type { VoteReceiptEntity } from '../../src/modules/voting/domain/vote-receipt.entity';

/**
 * Doble in-memory de VotingRepository.
 *
 * No tiene `markVoterHasVoted` ni `hasVoterVoted` porque el puerto ya no los
 * declara: registrar "esta persona ya voto" junto a la hora permitia cruzar por
 * timestamp al votante con su opcion. Que el doble no pueda expresarlo es la
 * garantia en tiempo de compilacion de que no vuelva a aparecer.
 */
export class InMemoryVotingRepository implements VotingRepository {
  public elections: PublicElectionDetail[] = [];
  public receipts: VoteReceiptEntity[] = [];
  public commitments: Record<string, string[]> = {};
  public registeredTokens: Set<string> = new Set();

  private receiptSeq = 0;

  async findPublicActiveElections(): Promise<PublicElectionDetail[]> {
    return this.elections.filter((election) => election.estado === 'VOTACION_ABIERTA');
  }

  async findPublicElectionById(id: string): Promise<PublicElectionDetail | null> {
    return this.elections.find((election) => election.id === id) ?? null;
  }

  async findVoteReceiptByNullifier(nullifier: string): Promise<VoteReceiptEntity | null> {
    return this.receipts.find((receipt) => receipt.nullifier === nullifier) ?? null;
  }

  async saveVoteReceipt(data: CreateVoteReceiptData): Promise<VoteReceiptEntity> {
    this.receiptSeq += 1;
    const receipt: VoteReceiptEntity = {
      id: `receipt-${this.receiptSeq}`,
      electionId: data.electionId,
      optionId: data.optionId,
      nullifier: data.nullifier,
      txHash: data.txHash,
      createdAt: new Date(),
    };
    this.receipts.push(receipt);
    return receipt;
  }

  async findInsertedCommitmentsByElectionId(electionId: string): Promise<string[]> {
    return this.commitments[electionId] ?? [];
  }

  async isVoterRegistered(electionId: string, scopedTokenHash: string): Promise<boolean> {
    return this.registeredTokens.has(`${electionId}:${scopedTokenHash}`);
  }
}
