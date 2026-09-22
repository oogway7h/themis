import { Inject, Injectable } from '@nestjs/common';
import {
  VOTING_REPOSITORY,
  type VotingRepository,
  type PublicElectionDetail,
} from '../domain/voting.repository';

@Injectable()
export class ListPublicElectionsUseCase {
  constructor(
    @Inject(VOTING_REPOSITORY)
    private readonly votingRepository: VotingRepository,
  ) {}

  async execute(): Promise<PublicElectionDetail[]> {
    return this.votingRepository.findPublicActiveElections();
  }
}
