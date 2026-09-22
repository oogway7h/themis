import { DomainError } from '../../../shared/errors/domain-error';

export class BatchNotFoundError extends DomainError {
  readonly code = 'BATCH_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Lote no encontrado');
  }
}

export class AuthorityNotDesignatedForElectionError extends DomainError {
  readonly code = 'AUTHORITY_NOT_DESIGNATED_FOR_ELECTION';
  readonly httpStatus = 403;
  constructor() {
    super('La cuenta no está designada como autoridad de esta elección');
  }
}

export class BatchAlreadyApprovedByAuthorityError extends DomainError {
  readonly code = 'BATCH_ALREADY_APPROVED_BY_AUTHORITY';
  readonly httpStatus = 409;
  constructor() {
    super('Esta autoridad ya aprobó este lote');
  }
}

export class BatchNotPendingApprovalError extends DomainError {
  readonly code = 'BATCH_NOT_PENDING_APPROVAL';
  readonly httpStatus = 409;
  constructor() {
    super('El lote ya no está pendiente de aprobación');
  }
}
