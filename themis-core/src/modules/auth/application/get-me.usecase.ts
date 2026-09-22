import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../domain/platform-user.repository';
import { PlatformRole } from '../domain/platform-user.entity';

export interface GetMeOutput {
  sub: string;
  role: PlatformRole;
  nombreCompleto: string;
}

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly repository: PlatformUserRepository,
  ) {}

  async execute(userId: string): Promise<GetMeOutput> {
    const user = await this.repository.findById(userId);

    if (!user || !user.isActive) {
      // La sesion era valida (firma+exp ok) pero la cuenta ya no existe o fue
      // desactivada (soft-delete) despues de emitido el JWT.
      throw new UnauthorizedException('AUTH_SESSION_EXPIRED');
    }

    return { sub: user.id, role: user.role, nombreCompleto: user.nombreCompleto };
  }
}
