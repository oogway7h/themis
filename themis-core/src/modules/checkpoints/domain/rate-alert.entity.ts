export type RateAlertSeverity = 'WARNING';

export class RateAlert {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly windowStart: Date,
    public readonly windowEnd: Date,
    public readonly registrationCount: number,
    public readonly thresholdPerMinute: number,
    public readonly severity: RateAlertSeverity,
    public readonly createdAt: Date,
  ) {}
}
