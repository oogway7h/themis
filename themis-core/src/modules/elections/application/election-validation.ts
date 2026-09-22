import { MIN_OPTIONS } from '../domain/election.constants';
import { ElectionInvalidDateRangeError, ElectionMinOptionsError } from './election.errors';

interface DateRangeInput {
  registroInicio: Date;
  registroFin: Date;
  votacionInicio: Date;
  votacionFin: Date;
}

export function assertValidDateRange(input: DateRangeInput): void {
  if (input.registroFin <= input.registroInicio) {
    throw new ElectionInvalidDateRangeError();
  }
  if (input.votacionInicio < input.registroFin) {
    throw new ElectionInvalidDateRangeError();
  }
  if (input.votacionFin <= input.votacionInicio) {
    throw new ElectionInvalidDateRangeError();
  }
}

export function assertMinOptions(opciones: Array<{ nombre: string }>): void {
  if (
    opciones.length < MIN_OPTIONS ||
    opciones.some((option) => !option.nombre?.trim())
  ) {
    throw new ElectionMinOptionsError();
  }
}
