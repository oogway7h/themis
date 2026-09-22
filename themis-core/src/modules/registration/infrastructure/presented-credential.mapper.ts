import {
  PresentedCredential,
  PresentedCredentialStatus,
} from '../domain/presented-credential.entity';

interface PresentedCredentialRow {
  id: string;
  electionId: string;
  commitment: string;
  preparedMessage: string;
  signature: string;
  status: string;
  presentedAt: Date;
  batchId?: string | null;
}

export function presentedCredentialToDomain(row: PresentedCredentialRow): PresentedCredential {
  return new PresentedCredential(
    row.id,
    row.electionId,
    row.commitment,
    row.preparedMessage,
    row.signature,
    row.status as PresentedCredentialStatus,
    row.presentedAt,
    row.batchId ?? null,
  );
}
