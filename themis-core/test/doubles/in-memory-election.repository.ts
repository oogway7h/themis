import { Election, ElectionStatus } from '../../src/modules/elections/domain/election.entity';
import { Option } from '../../src/modules/elections/domain/option.entity';
import type {
  CreateElectionInput,
  ElectionRepository,
  ListElectionsFilter,
  UpdateElectionInput,
} from '../../src/modules/elections/domain/election.repository';
import type {
  ConfigureRollInput,
  RollConfigRepository,
} from '../../src/modules/elections/domain/roll-config.repository';
import type {
  CheckpointPolicyRepository,
  ConfigureCheckpointPolicyInput,
} from '../../src/modules/elections/domain/checkpoint-policy.repository';

export class InMemoryElectionRepository
  implements ElectionRepository, RollConfigRepository, CheckpointPolicyRepository
{
  private readonly elections = new Map<string, Election>();
  private sequence = 0;

  async create(input: CreateElectionInput): Promise<Election> {
    this.sequence += 1;
    const id = `election-${this.sequence}`;
    const opciones = input.opciones.map(
      (option, index) =>
        new Option(`option-${id}-${index}`, id, option.nombre, option.descripcion ?? null, index, new Date()),
    );
    const election = new Election(
      id,
      input.nombre,
      input.descripcion ?? null,
      input.registroInicio,
      input.registroFin,
      input.votacionInicio,
      input.votacionFin,
      'BORRADOR',
      new Date(),
      input.createdBy,
      new Date(),
      input.createdBy,
      opciones,
    );
    this.elections.set(id, election);
    return election;
  }

  async update(id: string, input: UpdateElectionInput): Promise<Election> {
    const existing = this.getOrThrow(id);
    const opciones = input.opciones
      ? input.opciones.map(
          (option, index) =>
            new Option(`option-${id}-${index}`, id, option.nombre, option.descripcion ?? null, index, new Date()),
        )
      : existing.opciones;

    const updated = this.clone(existing, {
      nombre: input.nombre ?? existing.nombre,
      descripcion: input.descripcion ?? existing.descripcion,
      registroInicio: input.registroInicio ?? existing.registroInicio,
      registroFin: input.registroFin ?? existing.registroFin,
      votacionInicio: input.votacionInicio ?? existing.votacionInicio,
      votacionFin: input.votacionFin ?? existing.votacionFin,
      updatedBy: input.updatedBy,
      opciones,
    });
    this.elections.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.elections.delete(id);
  }

  async findById(id: string): Promise<Election | null> {
    return this.elections.get(id) ?? null;
  }

  async findMany(filter: ListElectionsFilter): Promise<Election[]> {
    return [...this.elections.values()].filter((election) => {
      if (
        filter.nombre &&
        !election.nombre.toLowerCase().includes(filter.nombre.toLowerCase())
      ) {
        return false;
      }
      if (filter.estado && election.estado !== filter.estado) {
        return false;
      }
      if (!filter.estado && filter.estados && !filter.estados.includes(election.estado)) {
        return false;
      }
      return true;
    });
  }

  async configure(
    electionId: string,
    input: ConfigureRollInput | ConfigureCheckpointPolicyInput,
    updatedBy: string,
  ): Promise<Election> {
    const existing = this.getOrThrow(electionId);
    let updated: Election;

    if ('profundidadArbol' in input) {
      updated = this.clone(existing, {
        profundidadArbol: input.profundidadArbol,
        elegibilidadFacultad: input.elegibilidadFacultad,
        elegibilidadCarreras: input.elegibilidadCarreras,
        elegibilidadTipoUsuario: input.elegibilidadTipoUsuario,
        elegibilidadEstadoAcademico: input.elegibilidadEstadoAcademico,
        padronConfiguradoEn: new Date(),
        updatedBy,
      });
    } else {
      updated = this.clone(existing, {
        checkpointIntervalMinutes: input.checkpointIntervalMinutes,
        rateLimitThresholdPerMinute: input.rateLimitThresholdPerMinute,
        checkpointPolicyConfiguradoEn: new Date(),
        updatedBy,
      });
    }

    this.elections.set(electionId, updated);
    return updated;
  }

  async tryClaimCheckpoint(electionId: string, dueAtExpected: Date): Promise<boolean> {
    const existing = this.getOrThrow(electionId);
    if (
      existing.lastCheckpointClosedAt !== null &&
      existing.lastCheckpointClosedAt.getTime() > dueAtExpected.getTime()
    ) {
      return false;
    }
    this.elections.set(electionId, this.clone(existing, { lastCheckpointClosedAt: new Date() }));
    return true;
  }

  async transitionStatus(
    electionId: string,
    from: ElectionStatus,
    to: ElectionStatus,
  ): Promise<boolean> {
    const existing = this.getOrThrow(electionId);
    if (existing.estado !== from) {
      return false;
    }
    this.elections.set(electionId, this.clone(existing, { estado: to }));
    return true;
  }

  async setOnChainGroup(electionId: string, onChainGroupId: string): Promise<void> {
    const existing = this.getOrThrow(electionId);
    this.elections.set(
      electionId,
      this.clone(existing, { onChainGroupId, onChainGroupCreatedAt: new Date() }),
    );
  }

  async setMerkleRoot(electionId: string, merkleRoot: string): Promise<void> {
    const existing = this.getOrThrow(electionId);
    this.elections.set(electionId, this.clone(existing, { merkleRoot }));
  }

  /** Solo para tests: fuerza un estado que ninguna HU actual puede producir todavía. */
  forceStatus(id: string, estado: ElectionStatus): void {
    const existing = this.getOrThrow(id);
    this.elections.set(id, this.clone(existing, { estado }));
  }

  /** Solo para tests: setea directamente lastCheckpointClosedAt sin pasar por el CAS. */
  forceLastCheckpointClosedAt(id: string, value: Date | null): void {
    const existing = this.getOrThrow(id);
    this.elections.set(id, this.clone(existing, { lastCheckpointClosedAt: value }));
  }

  private clone(existing: Election, overrides: Partial<Record<string, unknown>>): Election {
    const merged = { ...existing, ...overrides } as Election & Record<string, unknown>;
    return new Election(
      existing.id,
      merged.nombre as string,
      merged.descripcion as string | null,
      merged.registroInicio as Date,
      merged.registroFin as Date,
      merged.votacionInicio as Date,
      merged.votacionFin as Date,
      merged.estado as ElectionStatus,
      existing.createdAt,
      existing.createdBy,
      new Date(),
      (merged.updatedBy as string) ?? existing.updatedBy,
      merged.opciones as Option[],
      (merged.profundidadArbol as number | null) ?? null,
      merged.elegibilidadFacultad as Election['elegibilidadFacultad'],
      (merged.elegibilidadCarreras as Election['elegibilidadCarreras']) ?? [],
      merged.elegibilidadTipoUsuario as Election['elegibilidadTipoUsuario'],
      merged.elegibilidadEstadoAcademico as Election['elegibilidadEstadoAcademico'],
      (merged.padronConfiguradoEn as Date | null) ?? null,
      (merged.checkpointIntervalMinutes as number | null) ?? null,
      (merged.rateLimitThresholdPerMinute as number | null) ?? null,
      (merged.checkpointPolicyConfiguradoEn as Date | null) ?? null,
      (merged.lastCheckpointClosedAt as Date | null) ?? existing.lastCheckpointClosedAt,
      (merged.onChainGroupId as string | null) ?? existing.onChainGroupId,
      (merged.onChainGroupCreatedAt as Date | null) ?? existing.onChainGroupCreatedAt,
      (merged.merkleRoot as string | null) ?? existing.merkleRoot,
    );
  }

  private getOrThrow(id: string): Election {
    const existing = this.elections.get(id);
    if (!existing) {
      throw new Error(`Election ${id} no existe en el repositorio de prueba`);
    }
    return existing;
  }
}
