import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { verifyPassword } from '../infrastructure/hash.util';
import {
  MOCK_SSO_USER_REPOSITORY,
  MockSsoUserRepository,
} from '../domain/mock-sso-user.repository';
import { signAssertion } from '../domain/mock-sso-assertion';

export interface AuthenticateMockUserInput {
  codigoInstitucional: string;
  password: string;
}

export interface AuthenticateMockUserOutput {
  assertion: string;
}

@Injectable()
export class AuthenticateMockUserUseCase {
  constructor(
    @Inject(MOCK_SSO_USER_REPOSITORY)
    private readonly repository: MockSsoUserRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async execute(
    input: AuthenticateMockUserInput,
  ): Promise<AuthenticateMockUserOutput> {
    const user = await this.repository.findByCodigoInstitucional(
      input.codigoInstitucional,
    );

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('SSO_MOCK_INVALID_CREDENTIALS');
    }

    const habilitado =
      user.facultad === 'FICCT' &&
      user.tipoUsuario === 'ESTUDIANTE' &&
      user.estadoAcademico === 'ACTIVO';

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + this.config.ssoMock.tokenTtlSeconds;

    const assertion = signAssertion(
      {
        sub: user.id,
        facultad: user.facultad,
        tipoUsuario: user.tipoUsuario,
        habilitado,
        iat,
        exp,
      },
      this.config.ssoMock.secret,
    );

    return { assertion };
  }
}
