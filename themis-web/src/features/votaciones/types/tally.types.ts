// Contrato TS a mano, siguiendo PublicElectionResponseDto / TallyResponseDto
// de themis-core (src/modules/elections|voting/presentation/dto).
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.

export type PublicElectionStatus =
  | 'BORRADOR'
  | 'REGISTRO_ABIERTO'
  | 'REGISTRO_CERRADO'
  | 'VOTACION_ABIERTA'
  | 'CERRADA';

export interface PublicOptionDto {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface PublicElectionDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  votacionInicio: string;
  votacionFin: string;
  estado: PublicElectionStatus;
  opciones: PublicOptionDto[];
}

export interface TallyOptionDto {
  optionId: string;
  nombre: string;
  voteCount: number;
}

export interface TallyDto {
  electionId: string;
  estado: PublicElectionStatus;
  totalVotes: number;
  opciones: TallyOptionDto[];
  asOf: string;
}
