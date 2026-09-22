import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
  CreateElectionInput,
} from '../domain/election.repository';
import { Election } from '../domain/election.entity';
import { assertValidDateRange, assertMinOptions } from './election-validation';

export type CreateElectionUseCaseInput = Omit<CreateElectionInput, 'createdBy'>;

@Injectable()
export class CreateElectionUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly repository: ElectionRepository,
  ) {}

  async execute(input: CreateElectionUseCaseInput, actorId: string): Promise<Election> {
    assertValidDateRange(input);
    assertMinOptions(input.opciones);
    return this.repository.create({ ...input, createdBy: actorId });
  }
}
