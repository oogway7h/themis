import {
  RegistrationRequest,
  RegistrationRequestStatus,
} from '../domain/registration-request.entity';

interface RegistrationRequestRow {
  id: string;
  electionId: string;
  scopedTokenHash: string;
  blindedValue: string;
  status: string;
  createdAt: Date;
}

export function registrationRequestToDomain(
  row: RegistrationRequestRow,
): RegistrationRequest {
  return new RegistrationRequest(
    row.id,
    row.electionId,
    row.scopedTokenHash,
    row.blindedValue,
    row.status as RegistrationRequestStatus,
    row.createdAt,
  );
}
