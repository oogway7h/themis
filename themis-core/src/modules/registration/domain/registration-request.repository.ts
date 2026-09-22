import { RegistrationRequest } from './registration-request.entity';

export interface CreateRegistrationRequestInput {
  electionId: string;
  scopedTokenHash: string;
  blindedValue: string;
}

export interface RegistrationRequestRepository {
  create(input: CreateRegistrationRequestInput): Promise<RegistrationRequest>;
  findByElectionAndScopedTokenHash(
    electionId: string,
    scopedTokenHash: string,
  ): Promise<RegistrationRequest | null>;
}

export const REGISTRATION_REQUEST_REPOSITORY = 'REGISTRATION_REQUEST_REPOSITORY';
