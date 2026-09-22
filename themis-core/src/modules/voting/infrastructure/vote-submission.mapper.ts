import { VoteSubmission, VoteSubmissionSource } from '../domain/vote-submission.entity';

interface VoteSubmissionRow {
  id: string;
  electionId: string;
  optionId: string;
  nullifier: string;
  merkleTreeRoot: string;
  scope: string;
  source: string;
  submittedAt: Date;
  onChainTxHash: string | null;
  blockNumber: number | null;
}

export function voteSubmissionToDomain(row: VoteSubmissionRow): VoteSubmission {
  return new VoteSubmission(
    row.id,
    row.electionId,
    row.optionId,
    row.nullifier,
    row.merkleTreeRoot,
    row.scope,
    row.source as VoteSubmissionSource,
    row.submittedAt,
    row.onChainTxHash,
    row.blockNumber,
  );
}
