import { RateAlert, RateAlertSeverity } from '../domain/rate-alert.entity';

interface RateAlertRow {
  id: string;
  electionId: string;
  windowStart: Date;
  windowEnd: Date;
  registrationCount: number;
  thresholdPerMinute: number;
  severity: string;
  createdAt: Date;
}

export function rateAlertToDomain(row: RateAlertRow): RateAlert {
  return new RateAlert(
    row.id,
    row.electionId,
    row.windowStart,
    row.windowEnd,
    row.registrationCount,
    row.thresholdPerMinute,
    row.severity as RateAlertSeverity,
    row.createdAt,
  );
}
