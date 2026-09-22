import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../domain/platform-user.repository';

@Injectable()
export class DeactivatePlatformUserUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly repository: PlatformUserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);

    // Mismas reglas que update: SUPERUSUARIO no se puede desactivar por acá
    // (evita quedarse sin ninguna cuenta capaz de administrar cuentas), y
    // una cuenta ya desactivada responde 404 en vez de reintentar en silencio.
    if (!existing || !existing.isActive || existing.role === 'SUPERUSUARIO') {
      throw new NotFoundException('AUTH_USER_NOT_FOUND');
    }

    await this.repository.softDelete(id);
  }
}
