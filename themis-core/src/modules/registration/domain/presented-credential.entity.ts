export type PresentedCredentialStatus = 'PENDING' | 'BATCHED' | 'INSERTED' | 'REJECTED';

export class PresentedCredential {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly commitment: string,
    public readonly preparedMessage: string,
    public readonly signature: string,
    public readonly status: PresentedCredentialStatus,
    public readonly presentedAt: Date,
    public readonly batchId: string | null = null,
  ) {}
}
