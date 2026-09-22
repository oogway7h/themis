import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { Election } from '../../elections/domain/election.entity';
import {
  VOTE_SUBMISSION_REPOSITORY,
  VoteSubmissionRepository,
} from '../domain/vote-submission.repository';
import {
  CHAIN_SYNC_STATE_REPOSITORY,
  ChainSyncStateRepository,
} from '../domain/chain-sync-state.repository';
import {
  ELECTION_RESULT_REPOSITORY,
  ElectionResultRepository,
} from '../domain/election-result.repository';

interface PrismaKnownRequestErrorLike {
  code?: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

/**
 * CU-14: al cerrar una eleccion (estado=CERRADA, ya lo mueve el cron de
 * ciclo de vida de elections/), snapshotea el conteo final de forma
 * inmutable. Idempotente: una eleccion con ElectionResult ya creado se
 * salta. VotingScheduler llama esto siempre DESPUES de SyncVoteEventsUseCase
 * en el mismo tick, para que el snapshot ya vea los ultimos votos on-chain.
 */
@Injectable()
export class ExecuteFinalCountUseCase {
  private readonly logger = new Logger(ExecuteFinalCountUseCase.name);

  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(VOTE_SUBMISSION_REPOSITORY)
    private readonly voteSubmissionRepository: VoteSubmissionRepository,
    @Inject(CHAIN_SYNC_STATE_REPOSITORY)
    private readonly chainSyncStateRepository: ChainSyncStateRepository,
    @Inject(ELECTION_RESULT_REPOSITORY)
    private readonly electionResultRepository: ElectionResultRepository,
  ) {}

  async execute(): Promise<void> {
    const closedElections = await this.electionRepository.findMany({ estado: 'CERRADA' });

    for (const election of closedElections) {
      try {
        await this.finalizeElection(election);
      } catch (error) {
        this.logger.warn(
          `Fallo el conteo final de election=${election.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async finalizeElection(election: Election): Promise<void> {
    const existing = await this.electionResultRepository.findByElection(election.id);
    if (existing) {
      return;
    }

    const counts = await this.voteSubmissionRepository.countByOption(election.id);
    const totalVotes = counts.reduce((sum, row) => sum + row.voteCount, 0);
    const syncState = await this.chainSyncStateRepository.findByElection(election.id);

    try {
      await this.electionResultRepository.create({
        electionId: election.id,
        totalVotes,
        finalMerkleRoot: election.merkleRoot ?? '',
        sourceBlockNumber: syncState?.lastSyncedBlock ?? 0,
        opciones: counts,
      });
      this.logger.log(`Conteo final calculado para election=${election.id}: ${totalVotes} votos`);
    } catch (error) {
      // Otra corrida del cron ya gano la carrera -- no-op.
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }
}
