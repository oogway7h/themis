import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { VerifyMockAssertionUseCase } from '../../mock-sso/application/verify-mock-assertion.usecase';
import {
  VOTING_REPOSITORY,
  type VotingRepository,
} from '../domain/voting.repository';
import { ElectionNotFoundError } from '../domain/voting.errors';

export interface VoterStatusResult {
  electionId: string;
  isRegistered: boolean;
  hasVoted: boolean;
  votedAt: string | null;
}

function computeScopedTokenHash(
  secret: string,
  sub: string,
  electionId: string,
): string {
  return createHmac('sha256', secret)
    .update(`${sub}:${electionId}`)
    .digest('hex');
}

@Injectable()
export class GetVoterStatusUseCase {
  private readonly logger = new Logger(GetVoterStatusUseCase.name);

  constructor(
    @Inject(VOTING_REPOSITORY)
    private readonly votingRepository: VotingRepository,
    private readonly verifyMockAssertion: VerifyMockAssertionUseCase,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async execute(
    electionId: string,
    assertion: string,
  ): Promise<VoterStatusResult> {
    const election = await this.votingRepository.findPublicElectionById(
      electionId,
    );
    if (!election) {
      throw new ElectionNotFoundError();
    }

    const verification = this.verifyMockAssertion.execute({ assertion, ignoreExpiry: true });
    if (!verification.valid) {
      return {
        electionId,
        isRegistered: false,
        hasVoted: false,
        votedAt: null,
      };
    }

    const scopedTokenHash = computeScopedTokenHash(
      this.config.ssoMock.secret,
      verification.sub,
      electionId,
    );

    const isRegistered = await this.votingRepository.isVoterRegistered(
      electionId,
      scopedTokenHash,
    );
    const hasVoted = await this.votingRepository.hasVoterVoted(
      electionId,
      scopedTokenHash,
    );

    this.logger.log(
      `Estado del elector para eleccion ${electionId}: isRegistered=${isRegistered}, hasVoted=${hasVoted}`,
    );

    return {
      electionId,
      isRegistered,
      hasVoted,
      votedAt: null,
    };
  }
}
