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

    const verification = this.verifyMockAssertion.execute({ assertion });
    if (!verification.valid) {
      return { electionId, isRegistered: false };
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

    // No se loguea el scopedTokenHash: identifica a la persona, y dejarlo en
    // el log junto a la hora reintroduce por otra via la correlacion que la
    // tabla voter_participations permitia.
    this.logger.log(
      `Estado del elector consultado para eleccion ${electionId}`,
    );

    return { electionId, isRegistered };
  }
}
