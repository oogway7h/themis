import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AUTHORITY_REPOSITORY,
  AuthorityRepository,
} from '../../elections/domain/authority.repository';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import {
  PRESENTED_CREDENTIAL_REPOSITORY,
  PresentedCredentialRepository,
} from '../../registration/domain/presented-credential.repository';
import {
  BATCH_APPROVAL_REPOSITORY,
  BatchApprovalRepository,
} from '../domain/batch-approval.repository';
import {
  REGISTRATION_BATCH_REPOSITORY,
  RegistrationBatchRepository,
} from '../domain/registration-batch.repository';
import { RegistrationBatch } from '../domain/registration-batch.entity';
import { SEMAPHORE_ONCHAIN_PORT, SemaphoreOnChainPort } from '../domain/semaphore-onchain.port';
import {
  AuthorityNotDesignatedForElectionError,
  BatchAlreadyApprovedByAuthorityError,
  BatchNotFoundError,
  BatchNotPendingApprovalError,
} from './checkpoint.errors';

interface PrismaKnownRequestErrorLike {
  code?: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as PrismaKnownRequestErrorLike).code === 'P2002'
  );
}

/**
 * CU-08: una autoridad aprueba un lote pendiente. El multisig 3-de-5 se
 * implementa contando filas de BatchApproval, no con una columna "aprobado".
 * La 3ra aprobacion (la que cruza approvalsRequired) dispara, en el mismo
 * request, la insercion on-chain (CU-09) via SemaphoreOnChainPort -- sincrono,
 * con RetryPendingInsertionsUseCase como red de seguridad si falla.
 */
@Injectable()
export class ApproveBatchUseCase {
  private readonly logger = new Logger(ApproveBatchUseCase.name);

  constructor(
    @Inject(REGISTRATION_BATCH_REPOSITORY)
    private readonly registrationBatchRepository: RegistrationBatchRepository,
    @Inject(BATCH_APPROVAL_REPOSITORY)
    private readonly batchApprovalRepository: BatchApprovalRepository,
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(PRESENTED_CREDENTIAL_REPOSITORY)
    private readonly presentedCredentialRepository: PresentedCredentialRepository,
    @Inject(SEMAPHORE_ONCHAIN_PORT)
    private readonly onChain: SemaphoreOnChainPort,
  ) {}

  async execute(
    electionId: string,
    batchId: string,
    platformUserId: string,
  ): Promise<RegistrationBatch> {
    const batch = await this.registrationBatchRepository.findById(batchId);
    if (!batch || batch.electionId !== electionId) {
      throw new BatchNotFoundError();
    }

    const authorities = await this.authorityRepository.findByElection(electionId);
    const seat = authorities.find((authority) => authority.platformUserId === platformUserId);
    if (!seat) {
      throw new AuthorityNotDesignatedForElectionError();
    }

    if (batch.status !== 'PENDING_APPROVAL') {
      throw new BatchNotPendingApprovalError();
    }

    try {
      await this.batchApprovalRepository.create({
        batchId,
        authorityId: seat.id,
        platformUserId,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BatchAlreadyApprovedByAuthorityError();
      }
      throw error;
    }

    const approvalCount = await this.batchApprovalRepository.countByBatch(batchId);
    if (approvalCount < batch.approvalsRequired) {
      return (await this.registrationBatchRepository.findById(batchId)) ?? batch;
    }

    const wonInsertion = await this.registrationBatchRepository.tryTransition(
      batchId,
      'PENDING_APPROVAL',
      'APPROVED',
    );
    if (!wonInsertion) {
      return (await this.registrationBatchRepository.findById(batchId)) ?? batch;
    }

    return this.insertOnChain(electionId, batchId);
  }

  private async insertOnChain(electionId: string, batchId: string): Promise<RegistrationBatch> {
    try {
      const credentials = await this.presentedCredentialRepository.findByBatch(batchId);
      const commitments = credentials.map((credential) => credential.commitment);
      const result = await this.onChain.insertBatch(electionId, commitments);
      const updated = await this.registrationBatchRepository.markInserted(batchId, {
        merkleRootAfter: result.newRoot,
        onChainTxHash: result.txHash,
        onChainGroupId: result.groupId,
        onChainMemberCommitments: commitments,
      });
      await this.electionRepository.setOnChainGroup(electionId, result.groupId);
      await this.electionRepository.setMerkleRoot(electionId, result.newRoot);
      return updated;
    } catch (error) {
      this.logger.error(
        `Fallo la insercion on-chain del lote ${batchId}: ${(error as Error).message}`,
      );
      return this.registrationBatchRepository.markInsertionFailed(
        batchId,
        (error as Error).message,
      );
    }
  }
}
