export type RegistrationRequestStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'BATCHED'
  | 'INSERTED'
  | 'REJECTED';

export class RegistrationRequest {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly scopedTokenHash: string,
    public readonly blindedValue: string,
    public readonly status: RegistrationRequestStatus,
    public readonly createdAt: Date,
  ) {}
}
