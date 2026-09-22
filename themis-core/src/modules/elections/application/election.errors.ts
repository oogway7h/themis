import { DomainError } from '../../../shared/errors/domain-error';

export class ElectionInvalidDateRangeError extends DomainError {
  readonly code = 'ELECTION_INVALID_DATE_RANGE';
  readonly httpStatus = 400;
  constructor() {
    super('El rango de fechas de registro/votación es incoherente');
  }
}

export class ElectionMinOptionsError extends DomainError {
  readonly code = 'ELECTION_MIN_OPTIONS';
  readonly httpStatus = 400;
  constructor() {
    super('La elección requiere al menos 2 opciones, todas con nombre');
  }
}

export class ElectionNotFoundError extends DomainError {
  readonly code = 'ELECTION_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Elección no encontrada');
  }
}

export class ElectionNotEditableError extends DomainError {
  readonly code = 'ELECTION_NOT_EDITABLE';
  readonly httpStatus = 409;
  constructor() {
    super('La elección solo puede editarse o eliminarse en estado BORRADOR');
  }
}

export class ElectionTreeDepthOutOfRangeError extends DomainError {
  readonly code = 'ELECTION_TREE_DEPTH_OUT_OF_RANGE';
  readonly httpStatus = 400;
  constructor() {
    super('La profundidad del árbol está fuera del rango soportado');
  }
}

export class ElectionEligibilityInvalidCatalogValueError extends DomainError {
  readonly code = 'ELECTION_ELIGIBILITY_INVALID_CATALOG_VALUE';
  readonly httpStatus = 400;
  constructor() {
    super('Un valor de elegibilidad no pertenece al catálogo cerrado');
  }
}

export class ElectionRollLockedError extends DomainError {
  readonly code = 'ELECTION_ROLL_LOCKED';
  readonly httpStatus = 409;
  constructor() {
    super('El padrón no puede modificarse: el registro ya está abierto');
  }
}

export class AuthorityQuotaInvalidError extends DomainError {
  readonly code = 'AUTHORITY_QUOTA_INVALID';
  readonly httpStatus = 400;
  constructor(message = 'Se requieren exactamente 5 autoridades, sin repetir cuenta') {
    super(message);
  }
}

export class AuthorityAccountNotFoundError extends DomainError {
  readonly code = 'AUTHORITY_ACCOUNT_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('La cuenta de plataforma indicada no existe');
  }
}

export class AuthorityAccountInvalidRoleError extends DomainError {
  readonly code = 'AUTHORITY_ACCOUNT_INVALID_ROLE';
  readonly httpStatus = 400;
  constructor() {
    super('La cuenta no tiene el rol AUTORIDAD_REGISTRO');
  }
}

export class AuthorityAccountInactiveError extends DomainError {
  readonly code = 'AUTHORITY_ACCOUNT_INACTIVE';
  readonly httpStatus = 400;
  constructor() {
    super('La cuenta está desactivada');
  }
}

export class AuthorityAlreadyDesignatedError extends DomainError {
  readonly code = 'AUTHORITY_ALREADY_DESIGNATED';
  readonly httpStatus = 409;
  constructor() {
    super('La cuenta ya está designada como autoridad en esta elección');
  }
}

export class AuthorityElectionClosedError extends DomainError {
  readonly code = 'AUTHORITY_ELECTION_CLOSED';
  readonly httpStatus = 409;
  constructor() {
    super('La elección está cerrada');
  }
}

export class AuthorityNotFoundError extends DomainError {
  readonly code = 'AUTHORITY_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Autoridad no encontrada');
  }
}

export class CheckpointIntervalOutOfRangeError extends DomainError {
  readonly code = 'CHECKPOINT_INTERVAL_OUT_OF_RANGE';
  readonly httpStatus = 400;
  constructor() {
    super('El intervalo de checkpoint está fuera del rango soportado');
  }
}

export class RateLimitThresholdOutOfRangeError extends DomainError {
  readonly code = 'RATE_LIMIT_THRESHOLD_OUT_OF_RANGE';
  readonly httpStatus = 400;
  constructor() {
    super('El umbral de límite de tasa está fuera del rango soportado');
  }
}

export class CheckpointPolicyLockedError extends DomainError {
  readonly code = 'CHECKPOINT_POLICY_LOCKED';
  readonly httpStatus = 409;
  constructor() {
    super('La política de checkpoints no puede modificarse: el registro ya está abierto');
  }
}
