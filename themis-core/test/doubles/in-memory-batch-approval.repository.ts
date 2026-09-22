import { BatchApproval } from '../../src/modules/checkpoints/domain/batch-approval.entity';
import type {
  BatchApprovalRepository,
  CreateBatchApprovalInput,
} from '../../src/modules/checkpoints/domain/batch-approval.repository';

export class InMemoryBatchApprovalRepository implements BatchApprovalRepository {
  private readonly approvals: BatchApproval[] = [];
  private sequence = 0;

  async create(input: CreateBatchApprovalInput): Promise<BatchApproval> {
    const duplicate = this.approvals.some(
      (approval) =>
        approval.batchId === input.batchId && approval.authorityId === input.authorityId,
    );
    if (duplicate) {
      const error = new Error('Unique constraint failed') as Error & { code?: string };
      error.code = 'P2002';
      throw error;
    }

    this.sequence += 1;
    const approval = new BatchApproval(
      `batch-approval-${this.sequence}`,
      input.batchId,
      input.authorityId,
      input.platformUserId,
      new Date(),
    );
    this.approvals.push(approval);
    return approval;
  }

  async countByBatch(batchId: string): Promise<number> {
    return this.approvals.filter((approval) => approval.batchId === batchId).length;
  }

  async findByBatch(batchId: string): Promise<BatchApproval[]> {
    return this.approvals.filter((approval) => approval.batchId === batchId);
  }
}
