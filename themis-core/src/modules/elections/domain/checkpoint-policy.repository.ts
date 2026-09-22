import { Election } from './election.entity';

export interface ConfigureCheckpointPolicyInput {
  checkpointIntervalMinutes: number;
  rateLimitThresholdPerMinute: number;
}

export interface CheckpointPolicyRepository {
  configure(
    electionId: string,
    input: ConfigureCheckpointPolicyInput,
    updatedBy: string,
  ): Promise<Election>;
}

export const CHECKPOINT_POLICY_REPOSITORY = 'CHECKPOINT_POLICY_REPOSITORY';
