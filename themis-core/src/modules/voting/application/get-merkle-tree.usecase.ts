import { Inject, Injectable } from '@nestjs/common';
import {
  REGISTRATION_BATCH_REPOSITORY,
  RegistrationBatchRepository,
} from '../../checkpoints/domain/registration-batch.repository';
import {
  VOTING_REPOSITORY,
  type VotingRepository,
} from '../domain/voting.repository';
import { ElectionNotFoundError } from '../domain/voting.errors';

export interface MerkleTreeDetail {
  electionId: string;
  onChainGroupId: string | null;
  merkleRoot: string | null;
  members: string[];
  depth: number;
}

/**
 * Hojas y raiz del arbol de Semaphore para que el votante genere su prueba.
 *
 * Las hojas salen de `RegistrationBatch.onChainMemberCommitments` de los lotes
 * ya `INSERTED`, en el mismo orden en que se mandaron a `addMembers`: es la
 * unica fuente que reproduce el arbol on-chain hoja por hoja. Antes se leia de
 * `PresentedCredential` ordenado por `presentedAt`, un orden que no coincide
 * necesariamente con el on-chain y daba una raiz distinta, y por lo tanto una
 * prueba invalida. Mismo criterio que GetVotingContextUseCase, que es lo que
 * consume `/prove`.
 *
 * Tampoco sincroniza nada on-chain: el padron solo crece por el checkpoint con
 * aprobacion 3-de-5 (CU-07/08/09). Si no hay lotes insertados todavia, la lista
 * de miembros viene vacia a proposito.
 */
@Injectable()
export class GetMerkleTreeUseCase {
  constructor(
    @Inject(VOTING_REPOSITORY)
    private readonly votingRepository: VotingRepository,
    @Inject(REGISTRATION_BATCH_REPOSITORY)
    private readonly registrationBatchRepository: RegistrationBatchRepository,
  ) {}

  async execute(electionId: string): Promise<MerkleTreeDetail> {
    const election = await this.votingRepository.findPublicElectionById(
      electionId,
    );
    if (!election) {
      throw new ElectionNotFoundError();
    }

    const batches = await this.registrationBatchRepository.findByElection(electionId);
    const members = batches
      .filter((batch) => batch.status === 'INSERTED')
      .sort((a, b) => {
        const aTime = a.insertedAt?.getTime() ?? 0;
        const bTime = b.insertedAt?.getTime() ?? 0;
        return aTime !== bTime ? aTime - bTime : a.id.localeCompare(b.id);
      })
      .flatMap((batch) => batch.onChainMemberCommitments);

    return {
      electionId: election.id,
      onChainGroupId: election.onChainGroupId,
      merkleRoot: election.merkleRoot,
      members,
      depth: 16,
    };
  }
}
