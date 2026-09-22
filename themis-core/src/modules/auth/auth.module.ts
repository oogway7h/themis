import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';
import { LoginPlatformUserUseCase } from './application/login-platform-user.usecase';
import { GetMeUseCase } from './application/get-me.usecase';
import { CreateUserUseCase } from './application/create-user.usecase';
import { ListPlatformUsersUseCase } from './application/list-platform-users.usecase';
import { UpdatePlatformUserUseCase } from './application/update-platform-user.usecase';
import { DeactivatePlatformUserUseCase } from './application/deactivate-platform-user.usecase';
import { PrismaPlatformUserRepository } from './infrastructure/prisma-platform-user.repository';
import { PLATFORM_USER_REPOSITORY } from './domain/platform-user.repository';
import { AuthSharedModule } from '../../shared/auth/auth-shared.module';

@Module({
  imports: [AuthSharedModule],
  controllers: [AuthController],
  providers: [
    LoginPlatformUserUseCase,
    GetMeUseCase,
    CreateUserUseCase,
    ListPlatformUsersUseCase,
    UpdatePlatformUserUseCase,
    DeactivatePlatformUserUseCase,
    {
      provide: PLATFORM_USER_REPOSITORY,
      useClass: PrismaPlatformUserRepository,
    },
  ],
  exports: [PLATFORM_USER_REPOSITORY],
})
export class AuthModule {}
