import { RateAlert } from './rate-alert.entity';

export interface CreateRateAlertInput {
  electionId: string;
  windowStart: Date;
  windowEnd: Date;
  registrationCount: number;
  thresholdPerMinute: number;
}

export interface RateAlertRepository {
  create(input: CreateRateAlertInput): Promise<RateAlert>;
  findByElection(electionId: string, limit?: number): Promise<RateAlert[]>;
  findLatestByElection(electionId: string): Promise<RateAlert | null>;
}

export const RATE_ALERT_REPOSITORY = 'RATE_ALERT_REPOSITORY';
