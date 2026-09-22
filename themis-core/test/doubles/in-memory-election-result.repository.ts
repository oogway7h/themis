import { ElectionResult } from '../../src/modules/voting/domain/election-result.entity';
import type {
  CreateElectionResultInput,
  ElectionResultRepository,
} from '../../src/modules/voting/domain/election-result.repository';

export class InMemoryElectionResultRepository implements ElectionResultRepository {
  private readonly rows = new Map<string, ElectionResult>();
  private sequence = 0;

  async findByElection(electionId: string): Promise<ElectionResult | null> {
    return this.rows.get(electionId) ?? null;
  }

  async create(input: CreateElectionResultInput): Promise<ElectionResult> {
    if (this.rows.has(input.electionId)) {
      const error = new Error('Unique constraint failed on [electionId]') as Error & {
        code: string;
      };
      error.code = 'P2002';
      throw error;
    }

    this.sequence += 1;
    const row = new ElectionResult(
      `result-${this.sequence}`,
      input.electionId,
      input.totalVotes,
      input.finalMerkleRoot,
      input.sourceBlockNumber,
      new Date(),
      input.opciones,
    );
    this.rows.set(input.electionId, row);
    return row;
  }
}
