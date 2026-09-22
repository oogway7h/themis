import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { BatchApproval } from '../domain/batch-approval.entity';
import type {
  BatchApprovalRepository,
  CreateBatchApprovalInput,
} from '../domain/batch-approval.repository';
import { batchApprovalToDomain } from './batch-approval.mapper';

@Injectable()
export class PrismaBatchApprovalRepository implements BatchApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateBatchApprovalInput): Promise<BatchApproval> {
    const row = await this.prisma.batchApproval.create({
      data: {
        batchId: input.batchId,
        authorityId: input.authorityId,
        platformUserId: input.platformUserId,
      },
    });
    return batchApprovalToDomain(row);
  }

  async countByBatch(batchId: string): Promise<number> {
    return this.prisma.batchApproval.count({ where: { batchId } });
  }

  async findByBatch(batchId: string): Promise<BatchApproval[]> {
    const rows = await this.prisma.batchApproval.findMany({
      where: { batchId },
      orderBy: { approvedAt: 'asc' },
    });
    return rows.map(batchApprovalToDomain);
  }
}
