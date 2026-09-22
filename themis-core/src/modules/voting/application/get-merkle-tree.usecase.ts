import { Inject, Injectable } from '@nestjs/common';
import {
  VOTING_REPOSITORY,
  type VotingRepository,
} from '../domain/voting.repository';
import { ElectionNotFoundError } from '../domain/voting.errors';
import { VotingOnChainService } from '../infrastructure/voting-onchain.service';

export interface MerkleTreeDetail {
  electionId: string;
  onChainGroupId: string | null;
  merkleRoot: string | null;
  members: string[];
  depth: number;
}

@Injectable()
export class GetMerkleTreeUseCase {
  constructor(
    @Inject(VOTING_REPOSITORY)
    private readonly votingRepository: VotingRepository,
    private readonly votingOnChainService: VotingOnChainService,
  ) {}

  async execute(electionId: string): Promise<MerkleTreeDetail> {
    const election = await this.votingRepository.findPublicElectionById(
      electionId,
    );
    if (!election) {
      throw new ElectionNotFoundError();
    }

    if (election.onChainGroupId) {
      await this.votingOnChainService.syncPendingCommitments(
        election.id,
        election.onChainGroupId,
      );
    }

    const members =
      await this.votingRepository.findInsertedCommitmentsByElectionId(
        electionId,
      );

    const refreshed = await this.votingRepository.findPublicElectionById(
      electionId,
    );

    return {
      electionId: election.id,
      onChainGroupId: election.onChainGroupId,
      merkleRoot: refreshed?.merkleRoot ?? election.merkleRoot,
      members,
      depth: 16,
    };
  }
}
