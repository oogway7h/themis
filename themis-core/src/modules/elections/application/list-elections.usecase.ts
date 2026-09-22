import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
  ListElectionsFilter,
} from '../domain/election.repository';
import { Election } from '../domain/election.entity';

@Injectable()
export class ListElectionsUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly repository: ElectionRepository,
  ) {}

  execute(filter: ListElectionsFilter): Promise<Election[]> {
    return this.repository.findMany(filter);
  }
}
