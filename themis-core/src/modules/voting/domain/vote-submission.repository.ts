import { VoteSubmission, VoteSubmissionSource } from './vote-submission.entity';

export interface CreateVoteSubmissionInput {
  electionId: string;
  optionId: string;
  nullifier: string;
  merkleTreeRoot: string;
  scope: string;
  source: VoteSubmissionSource;
  onChainTxHash: string | null;
  blockNumber: number | null;
}

export interface OptionTallyRow {
  optionId: string;
  voteCount: number;
}

export interface VoteSubmissionSourceCounts {
  total: number;
  relay: number;
  chainSync: number;
}

export interface VoteSubmissionRepository {
  /**
   * Idempotente respecto de `[electionId, nullifier]`: quien llama debe
   * capturar la violacion de constraint unica (P2002) y tratarla como
   * exito -- la tx on-chain ya confirmo, no es un error de negocio.
   */
  create(input: CreateVoteSubmissionInput): Promise<VoteSubmission>;
  countByOption(electionId: string): Promise<OptionTallyRow[]>;
  countByElection(electionId: string): Promise<number>;
  countBySource(electionId: string): Promise<VoteSubmissionSourceCounts>;
}

export const VOTE_SUBMISSION_REPOSITORY = 'VOTE_SUBMISSION_REPOSITORY';
