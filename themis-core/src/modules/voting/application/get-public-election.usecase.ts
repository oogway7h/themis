import { Inject, Injectable } from '@nestjs/common';
import {
  VOTING_REPOSITORY,
  type VotingRepository,
  type PublicElectionDetail,
} from '../domain/voting.repository';
import { ElectionNotFoundError } from '../domain/voting.errors';

@Injectable()
export class GetPublicElectionUseCase {
  constructor(
    @Inject(VOTING_REPOSITORY)
    private readonly votingRepository: VotingRepository,
  ) {}

  async execute(electionId: string): Promise<PublicElectionDetail> {
    const election = await this.votingRepository.findPublicElectionById(
      electionId,
    );
    if (!election) {
      throw new ElectionNotFoundError();
    }
    return election;
  }
}
