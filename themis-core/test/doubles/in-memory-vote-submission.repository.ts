import { VoteSubmission } from '../../src/modules/voting/domain/vote-submission.entity';
import type {
  CreateVoteSubmissionInput,
  OptionTallyRow,
  VoteSubmissionRepository,
  VoteSubmissionSourceCounts,
} from '../../src/modules/voting/domain/vote-submission.repository';

export class InMemoryVoteSubmissionRepository implements VoteSubmissionRepository {
  private readonly rows: VoteSubmission[] = [];
  private sequence = 0;

  async create(input: CreateVoteSubmissionInput): Promise<VoteSubmission> {
    const exists = this.rows.some(
      (row) => row.electionId === input.electionId && row.nullifier === input.nullifier,
    );
    if (exists) {
      const error = new Error('Unique constraint failed on [electionId, nullifier]') as Error & {
        code: string;
      };
      error.code = 'P2002';
      throw error;
    }

    this.sequence += 1;
    const row = new VoteSubmission(
      `vote-${this.sequence}`,
      input.electionId,
      input.optionId,
      input.nullifier,
      input.merkleTreeRoot,
      input.scope,
      input.source,
      new Date(),
      input.onChainTxHash,
      input.blockNumber,
    );
    this.rows.push(row);
    return row;
  }

  async countByOption(electionId: string): Promise<OptionTallyRow[]> {
    const counts = new Map<string, number>();
    for (const row of this.rows.filter((candidate) => candidate.electionId === electionId)) {
      counts.set(row.optionId, (counts.get(row.optionId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([optionId, voteCount]) => ({ optionId, voteCount }));
  }

  async countByElection(electionId: string): Promise<number> {
    return this.rows.filter((row) => row.electionId === electionId).length;
  }

  async countBySource(electionId: string): Promise<VoteSubmissionSourceCounts> {
    const rows = this.rows.filter((row) => row.electionId === electionId);
    const relay = rows.filter((row) => row.source === 'RELAY').length;
    const chainSync = rows.filter((row) => row.source === 'CHAIN_SYNC').length;
    return { total: relay + chainSync, relay, chainSync };
  }

  all(): VoteSubmission[] {
    return [...this.rows];
  }
}
