import { Election } from '../../elections/domain/election.entity';
import { VotingGroupNotReadyError, VotingWindowClosedError } from './voting.errors';

export function assertVotingWindowOpen(election: Election): void {
  if (election.estado !== 'VOTACION_ABIERTA') {
    throw new VotingWindowClosedError();
  }
}

export function assertGroupReady(election: Election): void {
  if (election.onChainGroupId === null) {
    throw new VotingGroupNotReadyError();
  }
}
