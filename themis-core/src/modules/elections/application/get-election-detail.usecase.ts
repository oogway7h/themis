import { Inject, Injectable } from '@nestjs/common';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import { Election } from '../domain/election.entity';
import { ElectionNotFoundError } from './election.errors';

@Injectable()
export class GetElectionDetailUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly repository: ElectionRepository,
  ) {}

  async execute(id: string): Promise<Election> {
    const election = await this.repository.findById(id);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    return election;
  }
}
