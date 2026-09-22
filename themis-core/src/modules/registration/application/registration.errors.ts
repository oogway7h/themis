import { DomainError } from '../../../shared/errors/domain-error';

export class RegistrationWindowClosedError extends DomainError {
  readonly code = 'REGISTRATION_WINDOW_CLOSED';
  readonly httpStatus = 409;
  constructor() {
    super('La elección no está en periodo de registro');
  }
}

export class RegistrationInvalidAssertionError extends DomainError {
  readonly code = 'REGISTRATION_INVALID_ASSERTION';
  readonly httpStatus = 401;
  constructor() {
    super('La assertion de SSO es inválida o expiró');
  }
}

export class RegistrationNotEligibleError extends DomainError {
  readonly code = 'REGISTRATION_NOT_ELIGIBLE';
  readonly httpStatus = 403;
  constructor() {
    super('El votante no está habilitado para registrarse');
  }
}

export class RegistrationAlreadyRegisteredError extends DomainError {
  readonly code = 'REGISTRATION_ALREADY_REGISTERED';
  readonly httpStatus = 409;
  constructor() {
    super('Ya existe una solicitud de registro para esta elección');
  }
}

export class CredentialInvalidSignatureError extends DomainError {
  readonly code = 'CREDENTIAL_INVALID_SIGNATURE';
  readonly httpStatus = 400;
  constructor() {
    super('La firma de la credencial no es válida');
  }
}

export class CredentialAlreadyPresentedError extends DomainError {
  readonly code = 'CREDENTIAL_ALREADY_PRESENTED';
  readonly httpStatus = 409;
  constructor() {
    super('Esta credencial ya fue presentada');
  }
}

export class ElectionClosedError extends DomainError {
  readonly code = 'ELECTION_CLOSED';
  readonly httpStatus = 409;
  constructor() {
    super('La elección ya está cerrada');
  }
}
