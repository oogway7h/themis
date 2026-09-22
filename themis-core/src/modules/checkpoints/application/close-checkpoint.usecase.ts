import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import {
  PRESENTED_CREDENTIAL_REPOSITORY,
  PresentedCredentialRepository,
} from '../../registration/domain/presented-credential.repository';
import {
  REGISTRATION_BATCH_REPOSITORY,
  RegistrationBatchRepository,
} from '../domain/registration-batch.repository';
import { RegistrationBatch } from '../domain/registration-batch.entity';
import { MULTISIG_THRESHOLD } from '../../elections/domain/election.constants';

/**
 * CU-07: cierra el checkpoint pendiente de una eleccion. Evita doble cierre
 * por carrera con un compare-and-swap sobre Election.lastCheckpointClosedAt
 * (ElectionRepository.tryClaimCheckpoint) -- solo quien gana la carrera sigue
 * adelante; si pierde, no-op silencioso. Si no hay PresentedCredential
 * PENDING, tambien es un no-op (no crea RegistrationBatch), pero la ventana
 * igual se considera cerrada.
 */
@Injectable()
export class CloseCheckpointUseCase {
  private readonly logger = new Logger(CloseCheckpointUseCase.name);

  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(PRESENTED_CREDENTIAL_REPOSITORY)
    private readonly presentedCredentialRepository: PresentedCredentialRepository,
    @Inject(REGISTRATION_BATCH_REPOSITORY)
    private readonly registrationBatchRepository: RegistrationBatchRepository,
  ) {}

  async execute(electionId: string, dueAtExpected: Date): Promise<RegistrationBatch | null> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      return null;
    }

    const won = await this.electionRepository.tryClaimCheckpoint(electionId, dueAtExpected);
    if (!won) {
      return null;
    }

    const pending = await this.presentedCredentialRepository.findPendingByElection(electionId);
    if (pending.length === 0) {
      return null;
    }

    const batch = await this.registrationBatchRepository.create({
      electionId,
      approvalsRequired: MULTISIG_THRESHOLD,
      merkleRootBefore: election.merkleRoot,
      credentialIds: pending.map((credential) => credential.id),
    });

    this.logger.log(
      `Checkpoint cerrado para election=${electionId}: lote ${batch.id} con ${batch.credentialCount} credenciales`,
    );
    return batch;
  }
}
