import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
  UpdateElectionInput,
} from '../domain/election.repository';
import { Election } from '../domain/election.entity';
import { assertValidDateRange, assertMinOptions } from './election-validation';
import { ElectionNotFoundError, ElectionNotEditableError } from './election.errors';

export type UpdateElectionUseCaseInput = Omit<UpdateElectionInput, 'updatedBy'>;

@Injectable()
export class UpdateElectionUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly repository: ElectionRepository,
  ) {}

  async execute(
    id: string,
    input: UpdateElectionUseCaseInput,
    actorId: string,
  ): Promise<Election> {
    const election = await this.repository.findById(id);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    if (!election.esEditable) {
      throw new ElectionNotEditableError();
    }

    assertValidDateRange({
      registroInicio: input.registroInicio ?? election.registroInicio,
      registroFin: input.registroFin ?? election.registroFin,
      votacionInicio: input.votacionInicio ?? election.votacionInicio,
      votacionFin: input.votacionFin ?? election.votacionFin,
    });

    if (input.opciones) {
      assertMinOptions(input.opciones);
    }

    return this.repository.update(id, { ...input, updatedBy: actorId });
  }
}
