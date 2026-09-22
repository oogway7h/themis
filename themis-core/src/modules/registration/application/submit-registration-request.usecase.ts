import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { ELECTION_REPOSITORY, ElectionRepository } from '../../elections/domain/election.repository';
import { ElectionNotFoundError } from '../../elections/application/election.errors';
import { VerifyMockAssertionUseCase } from '../../mock-sso/application/verify-mock-assertion.usecase';
import {
  REGISTRATION_REQUEST_REPOSITORY,
  RegistrationRequestRepository,
} from '../domain/registration-request.repository';
import { RegistrationRequest } from '../domain/registration-request.entity';
import { RegistrationSigningService } from '../infrastructure/registration-signing.service';
import { assertRegistrationWindowOpen } from './registration-validation';
import {
  RegistrationAlreadyRegisteredError,
  RegistrationInvalidAssertionError,
  RegistrationNotEligibleError,
} from './registration.errors';

export interface SubmitRegistrationRequestInput {
  assertion: string;
  blindedMessage: string;
}

export interface SubmitRegistrationRequestOutput {
  request: RegistrationRequest;
  blindSignature: string;
}

// scopedTokenHash = HMAC(SSO_MOCK_SECRET, sub + electionId): permite bloquear un
// segundo registro de la misma persona en la misma eleccion sin persistir el
// UUID real en ninguna tabla (regla 2 del CLAUDE.md raiz). Diseño ya
// documentado en mock-sso/README.md antes de que este modulo existiera.
function computeScopedTokenHash(secret: string, sub: string, electionId: string): string {
  return createHmac('sha256', secret).update(`${sub}:${electionId}`).digest('hex');
}

@Injectable()
export class SubmitRegistrationRequestUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(REGISTRATION_REQUEST_REPOSITORY)
    private readonly registrationRequestRepository: RegistrationRequestRepository,
    private readonly verifyMockAssertion: VerifyMockAssertionUseCase,
    private readonly registrationSigning: RegistrationSigningService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async execute(
    electionId: string,
    input: SubmitRegistrationRequestInput,
  ): Promise<SubmitRegistrationRequestOutput> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    assertRegistrationWindowOpen(election);

    const verification = this.verifyMockAssertion.execute({ assertion: input.assertion });
    if (!verification.valid) {
      throw new RegistrationInvalidAssertionError();
    }
    // Limitacion conocida: la assertion solo trae habilitado (formula fija de
    // mock-sso), no los criterios de elegibilidad especificos de la eleccion
    // (elegibilidadFacultad/elegibilidadCarreras/etc de CU-02). Ver plan.
    if (!verification.habilitado) {
      throw new RegistrationNotEligibleError();
    }

    const scopedTokenHash = computeScopedTokenHash(
      this.config.ssoMock.secret,
      verification.sub,
      electionId,
    );

    const existing = await this.registrationRequestRepository.findByElectionAndScopedTokenHash(
      electionId,
      scopedTokenHash,
    );
    if (existing) {
      throw new RegistrationAlreadyRegisteredError();
    }

    const blindSignature = await this.registrationSigning.blindSign(input.blindedMessage);

    const request = await this.registrationRequestRepository.create({
      electionId,
      scopedTokenHash,
      blindedValue: input.blindedMessage,
    });

    return { request, blindSignature };
  }
}
