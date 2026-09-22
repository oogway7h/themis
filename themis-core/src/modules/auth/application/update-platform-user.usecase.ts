import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../domain/platform-user.repository';
import { PlatformUser } from '../domain/platform-user.entity';
import { CreatablePlatformRole } from '../presentation/dto/create-user.dto';

export interface UpdatePlatformUserInput {
  id: string;
  nombreCompleto: string;
  role: CreatablePlatformRole;
}

@Injectable()
export class UpdatePlatformUserUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly repository: PlatformUserRepository,
  ) {}

  async execute(input: UpdatePlatformUserInput): Promise<PlatformUser> {
    const existing = await this.repository.findById(input.id);

    // SUPERUSUARIO no es editable por esta ruta -- mismo espiritu que "no
    // creable" (ver auth/README.md). Una cuenta ya desactivada tampoco.
    if (!existing || !existing.isActive || existing.role === 'SUPERUSUARIO') {
      throw new NotFoundException('AUTH_USER_NOT_FOUND');
    }

    const updated = await this.repository.update(input.id, {
      nombreCompleto: input.nombreCompleto,
      role: input.role,
    });

    if (!updated) {
      throw new NotFoundException('AUTH_USER_NOT_FOUND');
    }

    return updated;
  }
}
