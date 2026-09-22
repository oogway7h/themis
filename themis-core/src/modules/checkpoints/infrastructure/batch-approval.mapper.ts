import { BatchApproval } from '../domain/batch-approval.entity';

interface BatchApprovalRow {
  id: string;
  batchId: string;
  authorityId: string;
  platformUserId: string;
  approvedAt: Date;
}

export function batchApprovalToDomain(row: BatchApprovalRow): BatchApproval {
  return new BatchApproval(
    row.id,
    row.batchId,
    row.authorityId,
    row.platformUserId,
    row.approvedAt,
  );
}
