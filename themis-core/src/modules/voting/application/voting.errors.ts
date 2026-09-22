import { DomainError } from '../../../shared/errors/domain-error';

export class VotingWindowClosedError extends DomainError {
  readonly code = 'VOTING_WINDOW_CLOSED';
  readonly httpStatus = 409;
  constructor() {
    super('La elección no está en período de votación');
  }
}

export class VotingGroupNotReadyError extends DomainError {
  readonly code = 'VOTING_GROUP_NOT_READY';
  readonly httpStatus = 409;
  constructor() {
    super('Todavía no hay ningún lote insertado on-chain para esta elección');
  }
}

export class VoteScopeMismatchError extends DomainError {
  readonly code = 'VOTE_SCOPE_MISMATCH';
  readonly httpStatus = 400;
  constructor() {
    super('El scope de la prueba no corresponde al grupo on-chain de esta elección');
  }
}

export class VoteOptionNotFoundError extends DomainError {
  readonly code = 'VOTE_OPTION_NOT_FOUND';
  readonly httpStatus = 400;
  constructor() {
    super('La opción elegida no pertenece a esta elección');
  }
}

export class VoteAlreadyCastError extends DomainError {
  readonly code = 'VOTE_ALREADY_CAST';
  readonly httpStatus = 409;
  constructor() {
    super('Ya se emitió un voto con esa identidad en esta elección');
  }
}

export class VoteInvalidProofError extends DomainError {
  readonly code = 'VOTE_INVALID_PROOF';
  readonly httpStatus = 400;
  constructor() {
    super(
      'La prueba no es válida (posible causa: la raíz del árbol usada ya venció, reintentar)',
    );
  }
}
