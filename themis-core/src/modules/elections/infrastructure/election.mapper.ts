import { Election, ElectionStatus } from '../domain/election.entity';
import { Option } from '../domain/option.entity';
import type {
  FacultadSso,
  CarreraSso,
  TipoUsuarioSso,
  EstadoAcademicoSso,
} from '../../mock-sso/domain/mock-sso-user.entity';

interface OptionRow {
  id: string;
  electionId: string;
  nombre: string;
  descripcion: string | null;
  onChainIndex: number;
  createdAt: Date;
}

interface ElectionRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  registroInicio: Date;
  registroFin: Date;
  votacionInicio: Date;
  votacionFin: Date;
  estado: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  opciones?: OptionRow[];
  profundidadArbol: number | null;
  elegibilidadFacultad: string | null;
  elegibilidadCarreras: string[];
  elegibilidadTipoUsuario: string | null;
  elegibilidadEstadoAcademico: string | null;
  padronConfiguradoEn: Date | null;
  checkpointIntervalMinutes: number | null;
  rateLimitThresholdPerMinute: number | null;
  checkpointPolicyConfiguradoEn: Date | null;
  lastCheckpointClosedAt: Date | null;
  onChainGroupId: string | null;
  onChainGroupCreatedAt: Date | null;
  merkleRoot: string | null;
}

export function optionToDomain(row: OptionRow): Option {
  return new Option(
    row.id,
    row.electionId,
    row.nombre,
    row.descripcion,
    row.onChainIndex,
    row.createdAt,
  );
}

export function electionToDomain(row: ElectionRow): Election {
  return new Election(
    row.id,
    row.nombre,
    row.descripcion,
    row.registroInicio,
    row.registroFin,
    row.votacionInicio,
    row.votacionFin,
    row.estado as ElectionStatus,
    row.createdAt,
    row.createdBy,
    row.updatedAt,
    row.updatedBy,
    (row.opciones ?? []).map(optionToDomain),
    row.profundidadArbol,
    row.elegibilidadFacultad as FacultadSso | null,
    (row.elegibilidadCarreras ?? []) as CarreraSso[],
    row.elegibilidadTipoUsuario as TipoUsuarioSso | null,
    row.elegibilidadEstadoAcademico as EstadoAcademicoSso | null,
    row.padronConfiguradoEn,
    row.checkpointIntervalMinutes,
    row.rateLimitThresholdPerMinute,
    row.checkpointPolicyConfiguradoEn,
    row.lastCheckpointClosedAt,
    row.onChainGroupId,
    row.onChainGroupCreatedAt,
    row.merkleRoot,
  );
}
