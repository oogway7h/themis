import { CreateElectionUseCase } from './create-election.usecase';
import { ConfigureElectionRollUseCase } from './configure-election-roll.usecase';
import {
  ElectionTreeDepthOutOfRangeError,
  ElectionEligibilityInvalidCatalogValueError,
  ElectionRollLockedError,
} from './election.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';

describe('ConfigureElectionRollUseCase', () => {
  let repository: InMemoryElectionRepository;
  let createUseCase: CreateElectionUseCase;
  let useCase: ConfigureElectionRollUseCase;

  beforeEach(() => {
    repository = new InMemoryElectionRepository();
    createUseCase = new CreateElectionUseCase(repository);
    useCase = new ConfigureElectionRollUseCase(repository, repository);
  });

  async function createElection() {
    return createUseCase.execute(
      {
        nombre: 'Representante FICCT',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );
  }

  function validRollInput(overrides: Partial<{ profundidadArbol: number }> = {}) {
    return {
      profundidadArbol: 13,
      elegibilidadFacultad: 'FICCT' as const,
      elegibilidadCarreras: [],
      elegibilidadTipoUsuario: 'ESTUDIANTE' as const,
      elegibilidadEstadoAcademico: 'ACTIVO' as const,
      ...overrides,
    };
  }

  it('configura el padrón calculando la capacidad máxima (AC-01, AC-02)', async () => {
    const election = await createElection();

    const updated = await useCase.execute(election.id, validRollInput(), 'admin-2');

    expect(updated.profundidadArbol).toBe(13);
    expect(updated.capacidadMaxima).toBe(2n ** 13n);
    expect(updated.padronConfigurado).toBe(true);
    expect(updated.updatedBy).toBe('admin-2');
  });

  it('rechaza una profundidad por debajo de MIN_TREE_DEPTH = 4', async () => {
    const election = await createElection();

    await expect(
      useCase.execute(election.id, validRollInput({ profundidadArbol: 3 }), 'admin-2'),
    ).rejects.toBeInstanceOf(ElectionTreeDepthOutOfRangeError);
  });

  it('rechaza una profundidad por encima de MAX_TREE_DEPTH = 20', async () => {
    const election = await createElection();

    await expect(
      useCase.execute(election.id, validRollInput({ profundidadArbol: 21 }), 'admin-2'),
    ).rejects.toBeInstanceOf(ElectionTreeDepthOutOfRangeError);
  });

  it('rechaza una facultad fuera del catálogo cerrado (AC-02)', async () => {
    const election = await createElection();
    const input = { ...validRollInput(), elegibilidadFacultad: 'DERECHO' as never };

    await expect(useCase.execute(election.id, input, 'admin-2')).rejects.toBeInstanceOf(
      ElectionEligibilityInvalidCatalogValueError,
    );
  });

  it('rechaza configurar el padrón si el registro ya está abierto (AC-04)', async () => {
    const election = await createElection();
    repository.forceStatus(election.id, 'REGISTRO_ABIERTO');

    await expect(useCase.execute(election.id, validRollInput(), 'admin-2')).rejects.toBeInstanceOf(
      ElectionRollLockedError,
    );
  });
});
