import { Module } from '@nestjs/common';
import { RegistrationController } from './presentation/registration.controller';
import { RegistrationPublicKeyController } from './presentation/registration-public-key.controller';
import { PresentedCredentialController } from './presentation/presented-credential.controller';
import { SubmitRegistrationRequestUseCase } from './application/submit-registration-request.usecase';
import { PresentCredentialUseCase } from './application/present-credential.usecase';
import { PrismaRegistrationRequestRepository } from './infrastructure/prisma-registration-request.repository';
import { PrismaPresentedCredentialRepository } from './infrastructure/prisma-presented-credential.repository';
import { RegistrationSigningService } from './infrastructure/registration-signing.service';
import { REGISTRATION_REQUEST_REPOSITORY } from './domain/registration-request.repository';
import { PRESENTED_CREDENTIAL_REPOSITORY } from './domain/presented-credential.repository';
import { ElectionsModule } from '../elections/elections.module';
import { MockSsoModule } from '../mock-sso/mock-sso.module';

@Module({
  imports: [ElectionsModule, MockSsoModule],
  controllers: [
    RegistrationController,
    RegistrationPublicKeyController,
    PresentedCredentialController,
  ],
  providers: [
    SubmitRegistrationRequestUseCase,
    PresentCredentialUseCase,
    RegistrationSigningService,
    {
      provide: REGISTRATION_REQUEST_REPOSITORY,
      useClass: PrismaRegistrationRequestRepository,
    },
    {
      provide: PRESENTED_CREDENTIAL_REPOSITORY,
      useClass: PrismaPresentedCredentialRepository,
    },
  ],
  exports: [PRESENTED_CREDENTIAL_REPOSITORY],
})
export class RegistrationModule {}
