import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RegistrationBatch, RegistrationBatchStatus } from '../domain/registration-batch.entity';
import type {
  CreateRegistrationBatchInput,
  MarkInsertedInput,
  RegistrationBatchRepository,
} from '../domain/registration-batch.repository';
import { registrationBatchToDomain } from './registration-batch.mapper';

@Injectable()
export class PrismaRegistrationBatchRepository implements RegistrationBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRegistrationBatchInput): Promise<RegistrationBatch> {
    const row = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.registrationBatch.create({
        data: {
          electionId: input.electionId,
          credentialCount: input.credentialIds.length,
          approvalsRequired: input.approvalsRequired,
          merkleRootBefore: input.merkleRootBefore,
        },
      });

      await tx.presentedCredential.updateMany({
        where: { id: { in: input.credentialIds } },
        data: { status: 'BATCHED', batchId: batch.id },
      });

      return batch;
    });

    return registrationBatchToDomain(row);
  }

  async findById(id: string): Promise<RegistrationBatch | null> {
    const row = await this.prisma.registrationBatch.findUnique({ where: { id } });
    return row ? registrationBatchToDomain(row) : null;
  }

  async findByElection(electionId: string): Promise<RegistrationBatch[]> {
    const rows = await this.prisma.registrationBatch.findMany({
      where: { electionId },
      orderBy: { closedAt: 'desc' },
    });
    return rows.map(registrationBatchToDomain);
  }

  async findStuck(statuses: RegistrationBatchStatus[]): Promise<RegistrationBatch[]> {
    const rows = await this.prisma.registrationBatch.findMany({
      where: { status: { in: statuses } },
    });
    return rows.map(registrationBatchToDomain);
  }

  async tryTransition(
    id: string,
    expectedStatus: RegistrationBatchStatus,
    nextStatus: RegistrationBatchStatus,
  ): Promise<boolean> {
    const result = await this.prisma.registrationBatch.updateMany({
      where: { id, status: expectedStatus },
      data: { status: nextStatus },
    });
    return result.count === 1;
  }

  async markInserted(id: string, input: MarkInsertedInput): Promise<RegistrationBatch> {
    const row = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.registrationBatch.update({
        where: { id },
        data: {
          status: 'INSERTED',
          merkleRootAfter: input.merkleRootAfter,
          onChainTxHash: input.onChainTxHash,
          onChainGroupId: input.onChainGroupId,
          onChainMemberCommitments: input.onChainMemberCommitments,
          insertedAt: new Date(),
          // Un lote recuperado por reintento no debe conservar el error del intento fallido.
          failureReason: null,
        },
      });

      await tx.presentedCredential.updateMany({
        where: { batchId: id, status: 'BATCHED' },
        data: { status: 'INSERTED' },
      });

      return batch;
    });

    return registrationBatchToDomain(row);
  }

  async markInsertionFailed(id: string, reason: string): Promise<RegistrationBatch> {
    const row = await this.prisma.registrationBatch.update({
      where: { id },
      data: { status: 'INSERTION_FAILED', failureReason: reason },
    });
    return registrationBatchToDomain(row);
  }
}
