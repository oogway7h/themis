import { Module } from '@nestjs/common';
import { ElectionsController } from './presentation/elections.controller';
import { PublicElectionsController } from './presentation/public-elections.controller';
import { CreateElectionUseCase } from './application/create-election.usecase';
import { UpdateElectionUseCase } from './application/update-election.usecase';
import { DeleteElectionUseCase } from './application/delete-election.usecase';
import { ListElectionsUseCase } from './application/list-elections.usecase';
import { GetElectionDetailUseCase } from './application/get-election-detail.usecase';
import { ConfigureElectionRollUseCase } from './application/configure-election-roll.usecase';
import { GetElectionRollUseCase } from './application/get-election-roll.usecase';
import { DesignateAuthoritiesUseCase } from './application/designate-authorities.usecase';
import { ReplaceAuthorityUseCase } from './application/replace-authority.usecase';
import { ListAuthoritiesUseCase } from './application/list-authorities.usecase';
import { ConfigureCheckpointPolicyUseCase } from './application/configure-checkpoint-policy.usecase';
import { GetEffectivePolicyUseCase } from './application/get-effective-policy.usecase';
import { AdvanceElectionLifecycleUseCase } from './application/advance-election-lifecycle.usecase';
import { ElectionLifecycleScheduler } from './infrastructure/election-lifecycle.scheduler';
import { PrismaElectionRepository } from './infrastructure/prisma-election.repository';
import { PrismaRollConfigRepository } from './infrastructure/prisma-roll-config.repository';
import { PrismaAuthorityRepository } from './infrastructure/prisma-authority.repository';
import { PrismaCheckpointPolicyRepository } from './infrastructure/prisma-checkpoint-policy.repository';
import { ELECTION_REPOSITORY } from './domain/election.repository';
import { ROLL_CONFIG_REPOSITORY } from './domain/roll-config.repository';
import { AUTHORITY_REPOSITORY } from './domain/authority.repository';
import { CHECKPOINT_POLICY_REPOSITORY } from './domain/checkpoint-policy.repository';
import { AuthSharedModule } from '../../shared/auth/auth-shared.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthSharedModule, AuthModule],
  // PublicElectionsController ANTES que ElectionsController: Express matchea
  // por orden de registro, y GET /elections/:id (ADMIN-only) interceptaria
  // GET /elections/public si el orden fuera al reves.
  controllers: [PublicElectionsController, ElectionsController],
  providers: [
    CreateElectionUseCase,
    UpdateElectionUseCase,
    DeleteElectionUseCase,
    ListElectionsUseCase,
    GetElectionDetailUseCase,
    ConfigureElectionRollUseCase,
    GetElectionRollUseCase,
    DesignateAuthoritiesUseCase,
    ReplaceAuthorityUseCase,
    ListAuthoritiesUseCase,
    ConfigureCheckpointPolicyUseCase,
    GetEffectivePolicyUseCase,
    AdvanceElectionLifecycleUseCase,
    ElectionLifecycleScheduler,
    { provide: ELECTION_REPOSITORY, useClass: PrismaElectionRepository },
    { provide: ROLL_CONFIG_REPOSITORY, useClass: PrismaRollConfigRepository },
    { provide: AUTHORITY_REPOSITORY, useClass: PrismaAuthorityRepository },
    { provide: CHECKPOINT_POLICY_REPOSITORY, useClass: PrismaCheckpointPolicyRepository },
  ],
  exports: [ELECTION_REPOSITORY, AUTHORITY_REPOSITORY],
})
export class ElectionsModule {}
