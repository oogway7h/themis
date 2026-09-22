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
import { SEMAPHORE_ONCHAIN_PORT, SemaphoreOnChainPort } from '../domain/semaphore-onchain.port';

/**
 * Red de seguridad para CU-09: reintenta lotes que quedaron en APPROVED
 * (proceso murio entre el CAS y la llamada on-chain) o INSERTION_FAILED
 * (el RPC/relayer estaba caido cuando llego la 3ra aprobacion). No es el
 * disparador primario -- eso es ApproveBatchUseCase, sincrono. Invocado por
 * un cron mas espaciado (EVERY_5_MINUTES) en CheckpointScheduler.
 */
@Injectable()
export class RetryPendingInsertionsUseCase {
  private readonly logger = new Logger(RetryPendingInsertionsUseCase.name);

  constructor(
    @Inject(REGISTRATION_BATCH_REPOSITORY)
    private readonly registrationBatchRepository: RegistrationBatchRepository,
    @Inject(PRESENTED_CREDENTIAL_REPOSITORY)
    private readonly presentedCredentialRepository: PresentedCredentialRepository,
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(SEMAPHORE_ONCHAIN_PORT)
    private readonly onChain: SemaphoreOnChainPort,
  ) {}

  async execute(): Promise<void> {
    const stuck = await this.registrationBatchRepository.findStuck([
      'APPROVED',
      'INSERTION_FAILED',
    ]);

    for (const batch of stuck) {
      try {
        const credentials = await this.presentedCredentialRepository.findByBatch(batch.id);
        const commitments = credentials.map((credential) => credential.commitment);
        const result = await this.onChain.insertBatch(batch.electionId, commitments);

        await this.registrationBatchRepository.markInserted(batch.id, {
          merkleRootAfter: result.newRoot,
          onChainTxHash: result.txHash,
          onChainGroupId: result.groupId,
          onChainMemberCommitments: commitments,
        });
        await this.electionRepository.setOnChainGroup(batch.electionId, result.groupId);
        await this.electionRepository.setMerkleRoot(batch.electionId, result.newRoot);
        this.logger.log(`Reintento exitoso del lote ${batch.id}`);
      } catch (error) {
        this.logger.warn(
          `Reintento fallido del lote ${batch.id}: ${(error as Error).message}`,
        );
        await this.registrationBatchRepository.markInsertionFailed(
          batch.id,
          (error as Error).message,
        );
      }
    }
  }
}
