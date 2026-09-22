import {
  RegistrationBatch,
  RegistrationBatchStatus,
} from '../domain/registration-batch.entity';

interface RegistrationBatchRow {
  id: string;
  electionId: string;
  status: string;
  credentialCount: number;
  approvalsRequired: number;
  closedAt: Date;
  merkleRootBefore: string | null;
  merkleRootAfter: string | null;
  onChainTxHash: string | null;
  onChainGroupId: string | null;
  approvedAt: Date | null;
  insertedAt: Date | null;
  failureReason: string | null;
  onChainMemberCommitments: string[];
}

export function registrationBatchToDomain(row: RegistrationBatchRow): RegistrationBatch {
  return new RegistrationBatch(
    row.id,
    row.electionId,
    row.status as RegistrationBatchStatus,
    row.credentialCount,
    row.approvalsRequired,
    row.closedAt,
    row.merkleRootBefore,
    row.merkleRootAfter,
    row.onChainTxHash,
    row.onChainGroupId,
    row.approvedAt,
    row.insertedAt,
    row.failureReason,
    row.onChainMemberCommitments,
  );
}
