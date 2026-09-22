import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
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

// Los endpoints publicos de registro, presentacion de credencial y voto
// disparan transacciones que paga la wallet del relayer, asi que sin limite
// cualquiera puede agotarle el gas. El limite es por IP y deliberadamente
// generoso: la app es mobile-only y todo el campus puede salir por una sola
// IP (CGNAT), asi que un limite estricto bloquearia votantes legitimos. No
// reemplaza al anti-doble-voto, que es el nullifier on-chain.
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
