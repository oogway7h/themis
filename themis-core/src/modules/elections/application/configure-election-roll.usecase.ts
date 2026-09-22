import { Inject, Injectable } from '@nestjs/common';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import {
  ROLL_CONFIG_REPOSITORY,
  RollConfigRepository,
  ConfigureRollInput,
} from '../domain/roll-config.repository';
import { Election } from '../domain/election.entity';
import { assertTreeDepthInRange, assertEligibilityCatalogValues } from './roll-config-validation';
import { ElectionNotFoundError, ElectionRollLockedError } from './election.errors';

@Injectable()
export class ConfigureElectionRollUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(ROLL_CONFIG_REPOSITORY)
    private readonly rollConfigRepository: RollConfigRepository,
  ) {}

  async execute(
    electionId: string,
    input: ConfigureRollInput,
    actorId: string,
  ): Promise<Election> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    if (election.estado !== 'BORRADOR') {
      throw new ElectionRollLockedError();
    }

    assertTreeDepthInRange(input.profundidadArbol);
    assertEligibilityCatalogValues(input);

    return this.rollConfigRepository.configure(electionId, input, actorId);
  }
}
