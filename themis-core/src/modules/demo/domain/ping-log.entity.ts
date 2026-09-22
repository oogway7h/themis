export class PingLog {
  constructor(
    public readonly id: string,
    public readonly source: string,
    public readonly note: string | null,
    public readonly createdAt: Date,
  ) {}
}
