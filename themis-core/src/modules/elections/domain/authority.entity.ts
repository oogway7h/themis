export class Authority {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly platformUserId: string,
    public readonly rolDescriptivo: string,
    public readonly createdAt: Date,
    public readonly createdBy: string,
    public readonly updatedAt: Date,
    public readonly updatedBy: string,
  ) {}
}
