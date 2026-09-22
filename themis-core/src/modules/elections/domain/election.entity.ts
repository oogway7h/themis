import { Option } from './option.entity';
import {
  CRYPTO_MECHANISM,
  MULTISIG_THRESHOLD,
  DEFAULT_CHECKPOINT_INTERVAL_MINUTES,
  DEFAULT_RATE_LIMIT_THRESHOLD_PER_MINUTE,
} from './election.constants';
import type {
  FacultadSso,
  CarreraSso,
  TipoUsuarioSso,
  EstadoAcademicoSso,
} from '../../mock-sso/domain/mock-sso-user.entity';

export type ElectionStatus =
  | 'BORRADOR'
  | 'REGISTRO_ABIERTO'
  | 'REGISTRO_CERRADO'
  | 'VOTACION_ABIERTA'
  | 'CERRADA';

export class Election {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly descripcion: string | null,
    public readonly registroInicio: Date,
    public readonly registroFin: Date,
    public readonly votacionInicio: Date,
    public readonly votacionFin: Date,
    public readonly estado: ElectionStatus,
    public readonly createdAt: Date,
    public readonly createdBy: string,
    public readonly updatedAt: Date,
    public readonly updatedBy: string,
    public readonly opciones: Option[] = [],
    public readonly profundidadArbol: number | null = null,
    public readonly elegibilidadFacultad: FacultadSso | null = null,
    public readonly elegibilidadCarreras: CarreraSso[] = [],
    public readonly elegibilidadTipoUsuario: TipoUsuarioSso | null = null,
    public readonly elegibilidadEstadoAcademico: EstadoAcademicoSso | null = null,
    public readonly padronConfiguradoEn: Date | null = null,
    public readonly checkpointIntervalMinutes: number | null = null,
    public readonly rateLimitThresholdPerMinute: number | null = null,
    public readonly checkpointPolicyConfiguradoEn: Date | null = null,
    public readonly lastCheckpointClosedAt: Date | null = null,
    public readonly onChainGroupId: string | null = null,
    public readonly onChainGroupCreatedAt: Date | null = null,
    public readonly merkleRoot: string | null = null,
  ) {}

  get mecanismoCriptografico(): typeof CRYPTO_MECHANISM {
    return CRYPTO_MECHANISM;
  }

  get umbralFirmas(): number {
    return MULTISIG_THRESHOLD;
  }

  get esEditable(): boolean {
    return this.estado === 'BORRADOR';
  }

  get capacidadMaxima(): bigint | null {
    return this.profundidadArbol === null
      ? null
      : 2n ** BigInt(this.profundidadArbol);
  }

  get padronConfigurado(): boolean {
    return this.padronConfiguradoEn !== null;
  }

  get checkpointIntervalEfectivo(): number {
    return this.checkpointIntervalMinutes ?? DEFAULT_CHECKPOINT_INTERVAL_MINUTES;
  }

  get rateLimitThresholdEfectivo(): number {
    return (
      this.rateLimitThresholdPerMinute ?? DEFAULT_RATE_LIMIT_THRESHOLD_PER_MINUTE
    );
  }

  get politicaCheckpointEsPorDefecto(): boolean {
    return this.checkpointPolicyConfiguradoEn === null;
  }
}
