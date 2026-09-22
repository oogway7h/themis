import { Inject, Injectable } from '@nestjs/common';
import {
  AUTHORITY_REPOSITORY,
  AuthorityRepository,
} from '../../elections/domain/authority.repository';
import { Authority } from '../../elections/domain/authority.entity';
import {
  BATCH_APPROVAL_REPOSITORY,
  BatchApprovalRepository,
} from '../domain/batch-approval.repository';
import { BatchApproval } from '../domain/batch-approval.entity';
import {
  REGISTRATION_BATCH_REPOSITORY,
  RegistrationBatchRepository,
} from '../domain/registration-batch.repository';
import { RegistrationBatch } from '../domain/registration-batch.entity';
import { BatchNotFoundError } from './checkpoint.errors';

export interface ApprovalWithAuthority {
  approval: BatchApproval;
  authority: Authority | null;
}

export interface BatchDetail {
  batch: RegistrationBatch;
  approvals: ApprovalWithAuthority[];
  yaAprobado: boolean;
}

/** Lectura para GET /elections/:id/batches/:batchId (detalle + aprobaciones). */
@Injectable()
export class GetBatchDetailUseCase {
  constructor(
    @Inject(REGISTRATION_BATCH_REPOSITORY)
    private readonly registrationBatchRepository: RegistrationBatchRepository,
    @Inject(BATCH_APPROVAL_REPOSITORY)
    private readonly batchApprovalRepository: BatchApprovalRepository,
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
  ) {}

  async execute(
    electionId: string,
    batchId: string,
    requesterPlatformUserId: string,
  ): Promise<BatchDetail> {
    const batch = await this.registrationBatchRepository.findById(batchId);
    if (!batch || batch.electionId !== electionId) {
      throw new BatchNotFoundError();
    }

    const [approvals, authorities] = await Promise.all([
      this.batchApprovalRepository.findByBatch(batchId),
      this.authorityRepository.findByElection(electionId),
    ]);
    const authoritiesById = new Map(authorities.map((authority) => [authority.id, authority]));
    const seat = authorities.find(
      (authority) => authority.platformUserId === requesterPlatformUserId,
    );

    return {
      batch,
      approvals: approvals.map((approval) => ({
        approval,
        authority: authoritiesById.get(approval.authorityId) ?? null,
      })),
      yaAprobado: seat
        ? approvals.some((approval) => approval.authorityId === seat.id)
        : false,
    };
  }
}
