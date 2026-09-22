import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import {
  verifyAssertion,
  verifyAssertionIgnoringExpiry,
} from '../domain/mock-sso-assertion';
import { FacultadSso } from '../domain/mock-sso-user.entity';

export interface VerifyMockAssertionInput {
  assertion: string;
  /** Si es true, no verifica la expiración del token (util en castVote/voterStatus) */
  ignoreExpiry?: boolean;
}

export type VerifyMockAssertionOutput =
  | { valid: true; sub: string; facultad: FacultadSso; habilitado: boolean }
  | { valid: false };

@Injectable()
export class VerifyMockAssertionUseCase {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  execute(input: VerifyMockAssertionInput): VerifyMockAssertionOutput {
    const verify = input.ignoreExpiry
      ? verifyAssertionIgnoringExpiry
      : verifyAssertion;

    const result = verify(input.assertion, this.config.ssoMock.secret);

    if (!result.valid) {
      return { valid: false };
    }

    return {
      valid: true,
      sub: result.payload.sub,
      facultad: result.payload.facultad,
      habilitado: result.payload.habilitado,
    };
  }
}
