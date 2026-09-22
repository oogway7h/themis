import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../infrastructure/password.util';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../domain/platform-user.repository';
import { PlatformRole } from '../domain/platform-user.entity';

export interface LoginPlatformUserInput {
  email: string;
  password: string;
}

export interface LoginPlatformUserOutput {
  accessToken: string;
  role: PlatformRole;
  nombreCompleto: string;
}

@Injectable()
export class LoginPlatformUserUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly repository: PlatformUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    input: LoginPlatformUserInput,
  ): Promise<LoginPlatformUserOutput> {
    const user = await this.repository.findByEmail(input.email);

    if (
      !user ||
      !user.isActive ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      // Una cuenta desactivada (soft-delete) responde igual que credenciales
      // invalidas -- no revela que el email existe pero fue deshabilitado.
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: '2h' },
    );

    return {
      accessToken,
      role: user.role,
      nombreCompleto: user.nombreCompleto,
    };
  }
}
