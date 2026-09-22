import { Inject, Injectable } from '@nestjs/common';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import {
  CHECKPOINT_POLICY_REPOSITORY,
  CheckpointPolicyRepository,
  ConfigureCheckpointPolicyInput,
} from '../domain/checkpoint-policy.repository';
import { Election } from '../domain/election.entity';
import {
  assertCheckpointIntervalInRange,
  assertRateLimitThresholdInRange,
  assertRegistrationNotOpen,
} from './checkpoint-policy-validation';
import { ElectionNotFoundError } from './election.errors';

@Injectable()
export class ConfigureCheckpointPolicyUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(CHECKPOINT_POLICY_REPOSITORY)
    private readonly checkpointPolicyRepository: CheckpointPolicyRepository,
  ) {}

  async execute(
    electionId: string,
    input: ConfigureCheckpointPolicyInput,
    actorId: string,
  ): Promise<Election> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    assertRegistrationNotOpen(election);
    assertCheckpointIntervalInRange(input.checkpointIntervalMinutes);
    assertRateLimitThresholdInRange(input.rateLimitThresholdPerMinute);

    return this.checkpointPolicyRepository.configure(electionId, input, actorId);
  }
}
