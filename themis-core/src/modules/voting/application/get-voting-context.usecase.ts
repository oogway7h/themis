import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import {
  REGISTRATION_BATCH_REPOSITORY,
  RegistrationBatchRepository,
} from '../../checkpoints/domain/registration-batch.repository';
import { assertGroupReady } from './voting-validation';

export interface VotingContextOption {
  id: string;
  onChainIndex: number;
}

export interface VotingContext {
  electionId: string;
  onChainGroupId: string;
  members: string[];
  options: VotingContextOption[];
}

/**
 * CU-10 (soporte): todo lo que el votante necesita para reconstruir el Group
 * de Semaphore del lado del cliente y generar su propia prueba de Merkle --
 * nada que permita reconstruir identidad real (regla 2). `members` sale de
 * RegistrationBatch.onChainMemberCommitments (el array exacto ya mandado a
 * addMembers), concatenado en el orden real de insercion on-chain.
 */
@Injectable()
export class GetVotingContextUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(REGISTRATION_BATCH_REPOSITORY)
    private readonly registrationBatchRepository: RegistrationBatchRepository,
  ) {}

  async execute(electionId: string): Promise<VotingContext> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }

    assertGroupReady(election);

    const batches = await this.registrationBatchRepository.findByElection(electionId);
    const insertedInOrder = batches
      .filter((batch) => batch.status === 'INSERTED')
      .sort((a, b) => {
        const aTime = a.insertedAt?.getTime() ?? 0;
        const bTime = b.insertedAt?.getTime() ?? 0;
        return aTime !== bTime ? aTime - bTime : a.id.localeCompare(b.id);
      });

    const members = insertedInOrder.flatMap((batch) => batch.onChainMemberCommitments);

    return {
      electionId: election.id,
      onChainGroupId: election.onChainGroupId as string,
      members,
      options: election.opciones.map((option) => ({
        id: option.id,
        onChainIndex: option.onChainIndex,
      })),
    };
  }
}
