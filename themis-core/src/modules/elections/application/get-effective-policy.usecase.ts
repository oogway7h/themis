import { Inject, Injectable } from '@nestjs/common';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import { ElectionNotFoundError } from './election.errors';

export interface EffectivePolicy {
  checkpointIntervalMinutes: number;
  rateLimitThresholdPerMinute: number;
  esValorPorDefecto: boolean;
}

@Injectable()
export class GetEffectivePolicyUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly repository: ElectionRepository,
  ) {}

  async execute(electionId: string): Promise<EffectivePolicy> {
    const election = await this.repository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }

    return {
      checkpointIntervalMinutes: election.checkpointIntervalEfectivo,
      rateLimitThresholdPerMinute: election.rateLimitThresholdEfectivo,
      esValorPorDefecto: election.politicaCheckpointEsPorDefecto,
    };
  }
}
