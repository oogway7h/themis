import { Module } from '@nestjs/common';
import { MockSsoController } from './presentation/mock-sso.controller';
import { AuthenticateMockUserUseCase } from './application/authenticate-mock-user.usecase';
import { VerifyMockAssertionUseCase } from './application/verify-mock-assertion.usecase';
import { PrismaMockSsoUserRepository } from './infrastructure/prisma-mock-sso-user.repository';
import { MOCK_SSO_USER_REPOSITORY } from './domain/mock-sso-user.repository';

@Module({
  controllers: [MockSsoController],
  providers: [
    AuthenticateMockUserUseCase,
    VerifyMockAssertionUseCase,
    {
      provide: MOCK_SSO_USER_REPOSITORY,
      useClass: PrismaMockSsoUserRepository,
    },
  ],
  exports: [VerifyMockAssertionUseCase],
})
export class MockSsoModule {}
