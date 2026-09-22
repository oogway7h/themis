import { ElectionResult, ElectionResultOptionTally } from './election-result.entity';

export interface CreateElectionResultInput {
  electionId: string;
  totalVotes: number;
  finalMerkleRoot: string;
  sourceBlockNumber: number;
  opciones: ElectionResultOptionTally[];
}

export interface ElectionResultRepository {
  findByElection(electionId: string): Promise<ElectionResult | null>;
  /**
   * Idempotente respecto de `electionId` (unico): quien llama debe capturar
   * P2002 y tratarlo como no-op -- otra corrida del cron ya gano la carrera.
   */
  create(input: CreateElectionResultInput): Promise<ElectionResult>;
}

export const ELECTION_RESULT_REPOSITORY = 'ELECTION_RESULT_REPOSITORY';
