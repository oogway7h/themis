import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { hashPassword } from '../infrastructure/password.util';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../domain/platform-user.repository';
import { PlatformUser } from '../domain/platform-user.entity';
import { CreatablePlatformRole } from '../presentation/dto/create-user.dto';

export interface CreateUserInput {
  email: string;
  password: string;
  nombreCompleto: string;
  role: CreatablePlatformRole;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly repository: PlatformUserRepository,
  ) {}

  async execute(input: CreateUserInput): Promise<PlatformUser> {
    const existing = await this.repository.findByEmail(input.email);

    if (existing) {
      throw new ConflictException('AUTH_EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(input.password);

    return this.repository.create({
      email: input.email,
      passwordHash,
      nombreCompleto: input.nombreCompleto,
      role: input.role,
    });
  }
}
