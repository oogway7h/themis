import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CheckpointsController } from './presentation/checkpoints.controller';
import { CloseCheckpointUseCase } from './application/close-checkpoint.usecase';
import { CloseDueCheckpointsUseCase } from './application/close-due-checkpoints.usecase';
import { ApproveBatchUseCase } from './application/approve-batch.usecase';
import { RetryPendingInsertionsUseCase } from './application/retry-pending-insertions.usecase';
import { CheckRegistrationRateUseCase } from './application/check-registration-rate.usecase';
import { ListBatchesUseCase } from './application/list-batches.usecase';
import { GetBatchDetailUseCase } from './application/get-batch-detail.usecase';
import { ListRateAlertsUseCase } from './application/list-rate-alerts.usecase';
import { ListMyAuthorityElectionsUseCase } from './application/list-my-authority-elections.usecase';
import { PrismaRegistrationBatchRepository } from './infrastructure/prisma-registration-batch.repository';
import { PrismaBatchApprovalRepository } from './infrastructure/prisma-batch-approval.repository';
import { PrismaRateAlertRepository } from './infrastructure/prisma-rate-alert.repository';
import { SemaphoreOnChainService } from './infrastructure/semaphore-onchain.service';
import { CheckpointScheduler } from './infrastructure/checkpoint.scheduler';
import { REGISTRATION_BATCH_REPOSITORY } from './domain/registration-batch.repository';
import { BATCH_APPROVAL_REPOSITORY } from './domain/batch-approval.repository';
import { RATE_ALERT_REPOSITORY } from './domain/rate-alert.repository';
import { SEMAPHORE_ONCHAIN_PORT } from './domain/semaphore-onchain.port';
import { AuthSharedModule } from '../../shared/auth/auth-shared.module';
import { ElectionsModule } from '../elections/elections.module';
import { RegistrationModule } from '../registration/registration.module';
import { BlockchainModule } from '../../shared/blockchain/blockchain.module';

@Module({
  imports: [
    AuthSharedModule,
    ElectionsModule,
    RegistrationModule,
    ScheduleModule.forRoot(),
    BlockchainModule,
  ],
  controllers: [CheckpointsController],
  providers: [
    CloseCheckpointUseCase,
    CloseDueCheckpointsUseCase,
    ApproveBatchUseCase,
    RetryPendingInsertionsUseCase,
    CheckRegistrationRateUseCase,
    ListBatchesUseCase,
    GetBatchDetailUseCase,
    ListRateAlertsUseCase,
    ListMyAuthorityElectionsUseCase,
    CheckpointScheduler,
    { provide: REGISTRATION_BATCH_REPOSITORY, useClass: PrismaRegistrationBatchRepository },
    { provide: BATCH_APPROVAL_REPOSITORY, useClass: PrismaBatchApprovalRepository },
    { provide: RATE_ALERT_REPOSITORY, useClass: PrismaRateAlertRepository },
    { provide: SEMAPHORE_ONCHAIN_PORT, useClass: SemaphoreOnChainService },
  ],
  exports: [REGISTRATION_BATCH_REPOSITORY],
})
export class CheckpointsModule {}
