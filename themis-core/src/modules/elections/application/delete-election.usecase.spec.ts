import { CreateElectionUseCase } from './create-election.usecase';
import { DeleteElectionUseCase } from './delete-election.usecase';
import { ElectionNotEditableError } from './election.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';

describe('DeleteElectionUseCase', () => {
  let repository: InMemoryElectionRepository;
  let createUseCase: CreateElectionUseCase;
  let deleteUseCase: DeleteElectionUseCase;

  beforeEach(() => {
    repository = new InMemoryElectionRepository();
    createUseCase = new CreateElectionUseCase(repository);
    deleteUseCase = new DeleteElectionUseCase(repository);
  });

  it('elimina una elección en BORRADOR (AC-05)', async () => {
    const election = await createUseCase.execute(
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

    await deleteUseCase.execute(election.id);

    expect(await repository.findById(election.id)).toBeNull();
  });

  it('rechaza eliminar una elección que no está en BORRADOR (AC-05)', async () => {
    const election = await createUseCase.execute(
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
    repository.forceStatus(election.id, 'CERRADA');

    await expect(deleteUseCase.execute(election.id)).rejects.toBeInstanceOf(
      ElectionNotEditableError,
    );
  });
});
