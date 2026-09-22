import { CreateElectionUseCase } from './create-election.usecase';
import { UpdateElectionUseCase } from './update-election.usecase';
import { ElectionNotEditableError, ElectionNotFoundError } from './election.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';

describe('UpdateElectionUseCase', () => {
  let repository: InMemoryElectionRepository;
  let createUseCase: CreateElectionUseCase;
  let updateUseCase: UpdateElectionUseCase;

  beforeEach(() => {
    repository = new InMemoryElectionRepository();
    createUseCase = new CreateElectionUseCase(repository);
    updateUseCase = new UpdateElectionUseCase(repository);
  });

  async function createBaseElection() {
    return createUseCase.execute(
      {
        nombre: 'Representante FICCT',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'Candidatura A' }, { nombre: 'Candidatura B' }],
      },
      'admin-1',
    );
  }

  it('edita una elección en BORRADOR (AC-05)', async () => {
    const election = await createBaseElection();

    const updated = await updateUseCase.execute(
      election.id,
      { nombre: 'Representante FICCT (editado)' },
      'admin-1',
    );

    expect(updated.nombre).toBe('Representante FICCT (editado)');
    expect(updated.updatedBy).toBe('admin-1');
  });

  it('rechaza editar una elección que no está en BORRADOR (AC-05)', async () => {
    const election = await createBaseElection();
    repository.forceStatus(election.id, 'REGISTRO_ABIERTO');

    await expect(
      updateUseCase.execute(election.id, { nombre: 'x' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ElectionNotEditableError);
  });

  it('rechaza si la elección no existe', async () => {
    await expect(
      updateUseCase.execute('no-existe', { nombre: 'x' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ElectionNotFoundError);
  });
});
