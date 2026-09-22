import {
  MIN_CHECKPOINT_INTERVAL_MINUTES,
  MAX_CHECKPOINT_INTERVAL_MINUTES,
  MIN_RATE_LIMIT_THRESHOLD,
  MAX_RATE_LIMIT_THRESHOLD,
} from '../domain/election.constants';
import {
  CheckpointIntervalOutOfRangeError,
  RateLimitThresholdOutOfRangeError,
  CheckpointPolicyLockedError,
} from './election.errors';
import { Election } from '../domain/election.entity';

export function assertCheckpointIntervalInRange(minutes: number): void {
  if (
    minutes < MIN_CHECKPOINT_INTERVAL_MINUTES ||
    minutes > MAX_CHECKPOINT_INTERVAL_MINUTES
  ) {
    throw new CheckpointIntervalOutOfRangeError();
  }
}

export function assertRateLimitThresholdInRange(threshold: number): void {
  if (threshold < MIN_RATE_LIMIT_THRESHOLD || threshold > MAX_RATE_LIMIT_THRESHOLD) {
    throw new RateLimitThresholdOutOfRangeError();
  }
}

export function assertRegistrationNotOpen(election: Election): void {
  if (election.estado !== 'BORRADOR') {
    throw new CheckpointPolicyLockedError();
  }
}
