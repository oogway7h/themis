import { PresentedCredential, PresentedCredentialStatus } from './presented-credential.entity';

export interface CreatePresentedCredentialInput {
  electionId: string;
  commitment: string;
  preparedMessage: string;
  signature: string;
  status?: PresentedCredentialStatus;
}

export interface PresentedCredentialRepository {
  create(input: CreatePresentedCredentialInput): Promise<PresentedCredential>;
  updateStatus(
    electionId: string,
    commitment: string,
    status: PresentedCredentialStatus,
  ): Promise<PresentedCredential>;
  findByElectionAndCommitment(
    electionId: string,
    commitment: string,
  ): Promise<PresentedCredential | null>;
  /** CU-07: credenciales PENDING de una elección, candidatas a un nuevo lote. */
  findPendingByElection(electionId: string): Promise<PresentedCredential[]>;
  /** CU-06: cuenta credenciales presentadas en una ventana de tiempo. */
  countPresentedBetween(electionId: string, from: Date, to: Date): Promise<number>;
  /** CU-08/CU-09: credenciales ya agrupadas en un lote (para leer sus commitments). */
  findByBatch(batchId: string): Promise<PresentedCredential[]>;
}

export const PRESENTED_CREDENTIAL_REPOSITORY = 'PRESENTED_CREDENTIAL_REPOSITORY';
