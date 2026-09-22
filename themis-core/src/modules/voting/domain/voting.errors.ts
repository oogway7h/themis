import { DomainError } from '../../../shared/errors/domain-error';

export class ElectionNotOpenForVotingError extends DomainError {
  readonly code = 'ELECTION_NOT_OPEN_FOR_VOTING';
  readonly httpStatus = 409;
  constructor(message = 'La elección no se encuentra con la votación abierta') {
    super(message);
  }
}

export class DuplicateVoteError extends DomainError {
  readonly code = 'DUPLICATE_VOTE';
  readonly httpStatus = 409;
  constructor(message = 'Este votante ya ha emitido su voto en esta elección') {
    super(message);
  }
}

export class InvalidProofError extends DomainError {
  readonly code = 'INVALID_PROOF';
  readonly httpStatus = 400;
  constructor(message = 'La prueba de conocimiento cero no es válida') {
    super(message);
  }
}

export class OptionNotFoundError extends DomainError {
  readonly code = 'OPTION_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('La opción seleccionada no pertenece a esta elección');
  }
}

export class ElectionNotFoundError extends DomainError {
  readonly code = 'ELECTION_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('La elección solicitada no existe');
  }
}
