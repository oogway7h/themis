import { BatchApproval } from './batch-approval.entity';

export interface CreateBatchApprovalInput {
  batchId: string;
  authorityId: string;
  platformUserId: string;
}

export interface BatchApprovalRepository {
  /** Debe rechazar duplicados de (batchId, authorityId) a nivel DB (constraint unica). */
  create(input: CreateBatchApprovalInput): Promise<BatchApproval>;
  countByBatch(batchId: string): Promise<number>;
  findByBatch(batchId: string): Promise<BatchApproval[]>;
}

export const BATCH_APPROVAL_REPOSITORY = 'BATCH_APPROVAL_REPOSITORY';
