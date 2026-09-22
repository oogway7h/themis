import { RegistrationBatch, RegistrationBatchStatus } from './registration-batch.entity';

export interface CreateRegistrationBatchInput {
  electionId: string;
  approvalsRequired: number;
  merkleRootBefore: string | null;
  credentialIds: string[];
}

export interface MarkInsertedInput {
  merkleRootAfter: string;
  onChainTxHash: string;
  onChainGroupId: string;
  /** CU-10: array exacto (mismo orden) mandado a `addMembers` para este lote. */
  onChainMemberCommitments: string[];
}

export interface RegistrationBatchRepository {
  /**
   * Crea el lote y, en la misma transaccion, pasa las PresentedCredential
   * indicadas (por id) a status='BATCHED' con este batchId.
   */
  create(input: CreateRegistrationBatchInput): Promise<RegistrationBatch>;
  findById(id: string): Promise<RegistrationBatch | null>;
  findByElection(electionId: string): Promise<RegistrationBatch[]>;
  /** Lotes atascados en APPROVED/INSERTION_FAILED, candidatos a reintento. */
  findStuck(statuses: RegistrationBatchStatus[]): Promise<RegistrationBatch[]>;
  /** CAS: solo transiciona si el lote sigue en expectedStatus. */
  tryTransition(
    id: string,
    expectedStatus: RegistrationBatchStatus,
    nextStatus: RegistrationBatchStatus,
  ): Promise<boolean>;
  /**
   * Marca el lote como INSERTED y, en la misma transaccion, pasa todas sus
   * PresentedCredential de BATCHED a INSERTED.
   */
  markInserted(id: string, input: MarkInsertedInput): Promise<RegistrationBatch>;
  markInsertionFailed(id: string, reason: string): Promise<RegistrationBatch>;
}

export const REGISTRATION_BATCH_REPOSITORY = 'REGISTRATION_BATCH_REPOSITORY';
