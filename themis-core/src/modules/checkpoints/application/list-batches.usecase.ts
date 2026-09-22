import { Inject, Injectable } from '@nestjs/common';
import {
  AUTHORITY_REPOSITORY,
  AuthorityRepository,
} from '../../elections/domain/authority.repository';
import {
  BATCH_APPROVAL_REPOSITORY,
  BatchApprovalRepository,
} from '../domain/batch-approval.repository';
import {
  REGISTRATION_BATCH_REPOSITORY,
  RegistrationBatchRepository,
} from '../domain/registration-batch.repository';
import { RegistrationBatch } from '../domain/registration-batch.entity';

export interface BatchListItem {
  batch: RegistrationBatch;
  approvalCount: number;
  yaAprobado: boolean;
}

/**
 * Lectura para GET /elections/:id/batches. yaAprobado se calcula contra el
 * asiento de authority del requester (si tiene uno en esta eleccion), para
 * que la pantalla de themis-web pueda deshabilitar el boton Aprobar sin una
 * segunda llamada.
 */
@Injectable()
export class ListBatchesUseCase {
  constructor(
    @Inject(REGISTRATION_BATCH_REPOSITORY)
    private readonly registrationBatchRepository: RegistrationBatchRepository,
    @Inject(BATCH_APPROVAL_REPOSITORY)
    private readonly batchApprovalRepository: BatchApprovalRepository,
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
  ) {}

  async execute(electionId: string, requesterPlatformUserId: string): Promise<BatchListItem[]> {
    const [batches, authorities] = await Promise.all([
      this.registrationBatchRepository.findByElection(electionId),
      this.authorityRepository.findByElection(electionId),
    ]);
    const seat = authorities.find(
      (authority) => authority.platformUserId === requesterPlatformUserId,
    );

    return Promise.all(
      batches.map(async (batch) => {
        const approvals = await this.batchApprovalRepository.findByBatch(batch.id);
        return {
          batch,
          approvalCount: approvals.length,
          yaAprobado: seat
            ? approvals.some((approval) => approval.authorityId === seat.id)
            : false,
        };
      }),
    );
  }
}
