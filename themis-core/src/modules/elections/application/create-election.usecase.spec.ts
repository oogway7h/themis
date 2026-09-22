import { CreateElectionUseCase } from './create-election.usecase';
import { ElectionInvalidDateRangeError, ElectionMinOptionsError } from './election.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';

function baseInput() {
  return {
    nombre: 'Representante FICCT',
    registroInicio: new Date('2026-01-01T00:00:00Z'),
    registroFin: new Date('2026-01-10T00:00:00Z'),
    votacionInicio: new Date('2026-01-10T00:00:00Z'),
    votacionFin: new Date('2026-01-12T00:00:00Z'),
    opciones: [{ nombre: 'Candidatura A' }, { nombre: 'Candidatura B' }],
  };
}

describe('CreateElectionUseCase', () => {
  let repository: InMemoryElectionRepository;
  let useCase: CreateElectionUseCase;

  beforeEach(() => {
    repository = new InMemoryElectionRepository();
    useCase = new CreateElectionUseCase(repository);
  });

  it('crea una elección en BORRADOR con mecanismo SEMAPHORE y umbral 3 (AC-01, AC-04)', async () => {
    const election = await useCase.execute(baseInput(), 'admin-1');

    expect(election.estado).toBe('BORRADOR');
    expect(election.mecanismoCriptografico).toBe('SEMAPHORE');
    expect(election.umbralFirmas).toBe(3);
    expect(election.opciones).toHaveLength(2);
    expect(election.createdBy).toBe('admin-1');
  });

  it('rechaza si la votación empieza antes del cierre del registro (AC-02)', async () => {
    const input = {
      ...baseInput(),
      votacionInicio: new Date('2026-01-05T00:00:00Z'),
    };

    await expect(useCase.execute(input, 'admin-1')).rejects.toBeInstanceOf(
      ElectionInvalidDateRangeError,
    );
  });

  it('rechaza con menos de 2 opciones (AC-03)', async () => {
    const input = { ...baseInput(), opciones: [{ nombre: 'Única opción' }] };

    await expect(useCase.execute(input, 'admin-1')).rejects.toBeInstanceOf(
      ElectionMinOptionsError,
    );
  });

  it('rechaza si alguna opción no tiene nombre (AC-03)', async () => {
    const input = {
      ...baseInput(),
      opciones: [{ nombre: 'Candidatura A' }, { nombre: '  ' }],
    };

    await expect(useCase.execute(input, 'admin-1')).rejects.toBeInstanceOf(
      ElectionMinOptionsError,
    );
  });
});
