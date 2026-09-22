import {
  RegistrationBatch,
  RegistrationBatchStatus,
} from '../../src/modules/checkpoints/domain/registration-batch.entity';
import type {
  CreateRegistrationBatchInput,
  MarkInsertedInput,
  RegistrationBatchRepository,
} from '../../src/modules/checkpoints/domain/registration-batch.repository';
import { InMemoryPresentedCredentialRepository } from './in-memory-presented-credential.repository';

export class InMemoryRegistrationBatchRepository implements RegistrationBatchRepository {
  private readonly batches = new Map<string, RegistrationBatch>();
  private sequence = 0;

  constructor(private readonly credentials: InMemoryPresentedCredentialRepository) {}

  async create(input: CreateRegistrationBatchInput): Promise<RegistrationBatch> {
    this.sequence += 1;
    const batch = new RegistrationBatch(
      `batch-${this.sequence}`,
      input.electionId,
      'PENDING_APPROVAL',
      input.credentialIds.length,
      input.approvalsRequired,
      new Date(),
      input.merkleRootBefore,
    );
    this.batches.set(batch.id, batch);
    this.credentials.markBatched(input.credentialIds, batch.id);
    return batch;
  }

  async findById(id: string): Promise<RegistrationBatch | null> {
    return this.batches.get(id) ?? null;
  }

  async findByElection(electionId: string): Promise<RegistrationBatch[]> {
    return [...this.batches.values()].filter((batch) => batch.electionId === electionId);
  }

  async findStuck(statuses: RegistrationBatchStatus[]): Promise<RegistrationBatch[]> {
    return [...this.batches.values()].filter((batch) => statuses.includes(batch.status));
  }

  async tryTransition(
    id: string,
    expectedStatus: RegistrationBatchStatus,
    nextStatus: RegistrationBatchStatus,
  ): Promise<boolean> {
    const existing = this.getOrThrow(id);
    if (existing.status !== expectedStatus) {
      return false;
    }
    this.batches.set(id, this.clone(existing, { status: nextStatus }));
    return true;
  }

  async markInserted(id: string, input: MarkInsertedInput): Promise<RegistrationBatch> {
    const existing = this.getOrThrow(id);
    const updated = this.clone(existing, {
      status: 'INSERTED',
      merkleRootAfter: input.merkleRootAfter,
      onChainTxHash: input.onChainTxHash,
      onChainGroupId: input.onChainGroupId,
      onChainMemberCommitments: input.onChainMemberCommitments,
      insertedAt: new Date(),
      failureReason: null,
    });
    this.batches.set(id, updated);
    this.credentials.markInsertedByBatch(id);
    return updated;
  }

  async markInsertionFailed(id: string, reason: string): Promise<RegistrationBatch> {
    const existing = this.getOrThrow(id);
    const updated = this.clone(existing, { status: 'INSERTION_FAILED', failureReason: reason });
    this.batches.set(id, updated);
    return updated;
  }

  private clone(
    existing: RegistrationBatch,
    overrides: Partial<Record<string, unknown>>,
  ): RegistrationBatch {
    const merged = { ...existing, ...overrides } as RegistrationBatch & Record<string, unknown>;
    return new RegistrationBatch(
      existing.id,
      existing.electionId,
      merged.status as RegistrationBatchStatus,
      existing.credentialCount,
      existing.approvalsRequired,
      existing.closedAt,
      merged.merkleRootBefore as string | null,
      merged.merkleRootAfter as string | null,
      merged.onChainTxHash as string | null,
      merged.onChainGroupId as string | null,
      merged.approvedAt as Date | null,
      merged.insertedAt as Date | null,
      merged.failureReason as string | null,
      merged.onChainMemberCommitments as string[],
    );
  }

  private getOrThrow(id: string): RegistrationBatch {
    const existing = this.batches.get(id);
    if (!existing) {
      throw new Error(`RegistrationBatch ${id} no existe en el repositorio de prueba`);
    }
    return existing;
  }
}
