export class BatchApproval {
  constructor(
    public readonly id: string,
    public readonly batchId: string,
    public readonly authorityId: string,
    public readonly platformUserId: string,
    public readonly approvedAt: Date,
  ) {}
}
