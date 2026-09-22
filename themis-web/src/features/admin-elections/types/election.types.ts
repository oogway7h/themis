// Contrato TS a mano, siguiendo
// themis-core/src/modules/elections/election.contract.json.
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.

export type ElectionStatus =
  | 'BORRADOR'
  | 'REGISTRO_ABIERTO'
  | 'REGISTRO_CERRADO'
  | 'VOTACION_ABIERTA'
  | 'CERRADA';

export interface OptionDto {
  id: string;
  electionId: string;
  nombre: string;
  descripcion: string | null;
}

export interface ElectionDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  registroInicio: string;
  registroFin: string;
  votacionInicio: string;
  votacionFin: string;
  estado: ElectionStatus;
  mecanismoCriptografico: 'SEMAPHORE';
  umbralFirmas: number;
  opciones: OptionDto[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface OptionInput {
  nombre: string;
  descripcion?: string;
}

export interface CreateElectionRequest {
  nombre: string;
  descripcion?: string;
  registroInicio: string;
  registroFin: string;
  votacionInicio: string;
  votacionFin: string;
  opciones: OptionInput[];
}

export type UpdateElectionRequest = Partial<CreateElectionRequest>;

export interface ListElectionsFilter {
  nombre?: string;
  estado?: ElectionStatus;
}
