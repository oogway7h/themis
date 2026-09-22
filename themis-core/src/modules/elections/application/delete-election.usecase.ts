import { Inject, Injectable } from '@nestjs/common';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import { ElectionNotFoundError, ElectionNotEditableError } from './election.errors';

@Injectable()
export class DeleteElectionUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly repository: ElectionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const election = await this.repository.findById(id);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    if (!election.esEditable) {
      throw new ElectionNotEditableError();
    }
    await this.repository.delete(id);
  }
}
