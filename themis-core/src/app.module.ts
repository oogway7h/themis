import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { BlockchainModule } from './shared/blockchain/blockchain.module';
import { AiClientModule } from './shared/http/ai-client.module';
import { HealthModule } from './modules/health/health.module';
import { DemoModule } from './modules/demo/demo.module';
import { MockSsoModule } from './modules/mock-sso/mock-sso.module';
import { AuthModule } from './modules/auth/auth.module';
import { ElectionsModule } from './modules/elections/elections.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { CheckpointsModule } from './modules/checkpoints/checkpoints.module';
import { VotingModule } from './modules/voting/voting.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    BlockchainModule,
    AiClientModule,
    HealthModule,
    DemoModule,
    MockSsoModule,
    AuthModule,
    ElectionsModule,
    RegistrationModule,
    CheckpointsModule,
    VotingModule,
  ],
})
export class AppModule {}
