import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import {
  VOTE_SUBMISSION_REPOSITORY,
  VoteSubmissionRepository,
} from '../domain/vote-submission.repository';

export interface TallyOption {
  optionId: string;
  nombre: string;
  voteCount: number;
}

export interface Tally {
  electionId: string;
  estado: string;
  totalVotes: number;
  opciones: TallyOption[];
  asOf: Date;
}

/**
 * CU-11: conteo de votos en vivo, publico (sin auth, sin identidad de
 * votante involucrada) -- lee de VoteSubmission, que es una cache de
 * lectura, no la fuente de verdad (la blockchain lo es).
 */
@Injectable()
export class GetLiveTallyUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(VOTE_SUBMISSION_REPOSITORY)
    private readonly voteSubmissionRepository: VoteSubmissionRepository,
  ) {}

  async execute(electionId: string): Promise<Tally> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }

    const counts = await this.voteSubmissionRepository.countByOption(electionId);
    const countByOptionId = new Map(counts.map((row) => [row.optionId, row.voteCount]));

    const opciones = election.opciones.map((option) => ({
      optionId: option.id,
      nombre: option.nombre,
      voteCount: countByOptionId.get(option.id) ?? 0,
    }));

    return {
      electionId: election.id,
      estado: election.estado,
      totalVotes: opciones.reduce((sum, option) => sum + option.voteCount, 0),
      opciones,
      asOf: new Date(),
    };
  }
}
