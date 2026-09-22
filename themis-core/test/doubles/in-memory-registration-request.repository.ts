import { RegistrationRequest } from '../../src/modules/registration/domain/registration-request.entity';
import type {
  CreateRegistrationRequestInput,
  RegistrationRequestRepository,
} from '../../src/modules/registration/domain/registration-request.repository';

export class InMemoryRegistrationRequestRepository implements RegistrationRequestRepository {
  private readonly requests: RegistrationRequest[] = [];
  private sequence = 0;

  async create(input: CreateRegistrationRequestInput): Promise<RegistrationRequest> {
    this.sequence += 1;
    const request = new RegistrationRequest(
      `registration-request-${this.sequence}`,
      input.electionId,
      input.scopedTokenHash,
      input.blindedValue,
      'PENDING',
      new Date(),
    );
    this.requests.push(request);
    return request;
  }

  async findByElectionAndScopedTokenHash(
    electionId: string,
    scopedTokenHash: string,
  ): Promise<RegistrationRequest | null> {
    return (
      this.requests.find(
        (request) =>
          request.electionId === electionId && request.scopedTokenHash === scopedTokenHash,
      ) ?? null
    );
  }
}
