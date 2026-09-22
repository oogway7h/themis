import { AUTHORITY_QUOTA } from '../domain/election.constants';
import { AuthorityQuotaInvalidError } from './election.errors';

export function assertExactQuota(inputs: Array<{ platformUserId: string }>): void {
  if (inputs.length !== AUTHORITY_QUOTA) {
    throw new AuthorityQuotaInvalidError(
      `Se requieren exactamente ${AUTHORITY_QUOTA} autoridades`,
    );
  }
  const unique = new Set(inputs.map((input) => input.platformUserId));
  if (unique.size !== inputs.length) {
    throw new AuthorityQuotaInvalidError(
      'No se puede repetir la misma cuenta en la misma designación',
    );
  }
}
