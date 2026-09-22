import { CreateElectionUseCase } from './create-election.usecase';
import { AdvanceElectionLifecycleUseCase } from './advance-election-lifecycle.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryAuthorityRepository } from '../../../../test/doubles/in-memory-authority.repository';

describe('AdvanceElectionLifecycleUseCase', () => {
  const registroInicio = new Date('2026-03-01T00:00:00Z');
  const registroFin = new Date('2026-03-10T00:00:00Z');
  const votacionInicio = new Date('2026-03-15T00:00:00Z');
  const votacionFin = new Date('2026-03-20T00:00:00Z');

  let electionRepository: InMemoryElectionRepository;
  let authorityRepository: InMemoryAuthorityRepository;
  let useCase: AdvanceElectionLifecycleUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    authorityRepository = new InMemoryAuthorityRepository();
    useCase = new AdvanceElectionLifecycleUseCase(electionRepository, authorityRepository);
  });

  async function createElection(options: { padron: boolean; authorities: number }) {
    const election = await new CreateElectionUseCase(electionRepository).execute(
      {
        nombre: 'Eleccion de prueba',
        registroInicio,
        registroFin,
        votacionInicio,
        votacionFin,
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );

    if (options.padron) {
      await electionRepository.configure(
        election.id,
        {
          profundidadArbol: 13,
          elegibilidadFacultad: 'FICCT',
          elegibilidadCarreras: [],
          elegibilidadTipoUsuario: 'ESTUDIANTE',
          elegibilidadEstadoAcademico: 'ACTIVO',
        },
        'admin-1',
      );
    }

    if (options.authorities > 0) {
      await authorityRepository.designateAll(
        election.id,
        Array.from({ length: options.authorities }, (_, i) => ({
          platformUserId: `user-${i}`,
          rolDescriptivo: 'Autoridad',
        })),
        'admin-1',
      );
    }

    return election;
  }

  async function estadoDe(id: string): Promise<string | undefined> {
    return (await electionRepository.findById(id))?.estado;
  }

  it('abre el registro al llegar registroInicio si el padron y las 5 autoridades estan listos', async () => {
    const election = await createElection({ padron: true, authorities: 5 });

    await useCase.execute(new Date('2026-03-01T00:00:00Z'));

    expect(await estadoDe(election.id)).toBe('REGISTRO_ABIERTO');
  });

  it('no abre el registro antes de registroInicio', async () => {
    const election = await createElection({ padron: true, authorities: 5 });

    await useCase.execute(new Date('2026-02-28T23:59:59Z'));

    expect(await estadoDe(election.id)).toBe('BORRADOR');
  });

  it('no abre el registro si el padron no esta configurado', async () => {
    const election = await createElection({ padron: false, authorities: 5 });

    await useCase.execute(new Date('2026-03-02T00:00:00Z'));

    expect(await estadoDe(election.id)).toBe('BORRADOR');
  });

  it('no abre el registro si no estan designadas las 5 autoridades', async () => {
    const election = await createElection({ padron: true, authorities: 4 });

    await useCase.execute(new Date('2026-03-02T00:00:00Z'));

    expect(await estadoDe(election.id)).toBe('BORRADOR');
  });

  it('abre apenas se completa la configuracion, en un tick posterior', async () => {
    const election = await createElection({ padron: true, authorities: 4 });
    const now = new Date('2026-03-02T00:00:00Z');

    await useCase.execute(now);
    expect(await estadoDe(election.id)).toBe('BORRADOR');

    await authorityRepository.designateAll(
      election.id,
      [{ platformUserId: 'user-4', rolDescriptivo: 'Autoridad' }],
      'admin-1',
    );
    await useCase.execute(now);

    expect(await estadoDe(election.id)).toBe('REGISTRO_ABIERTO');
  });

  it('no abre una eleccion en BORRADOR cuya ventana de registro ya vencio', async () => {
    const election = await createElection({ padron: true, authorities: 5 });

    await useCase.execute(new Date('2026-03-11T00:00:00Z'));

    expect(await estadoDe(election.id)).toBe('BORRADOR');
  });

  it('cierra el registro en registroFin y abre la votacion en votacionInicio', async () => {
    const election = await createElection({ padron: true, authorities: 5 });
    electionRepository.forceStatus(election.id, 'REGISTRO_ABIERTO');

    await useCase.execute(new Date('2026-03-09T23:59:59Z'));
    expect(await estadoDe(election.id)).toBe('REGISTRO_ABIERTO');

    await useCase.execute(new Date('2026-03-10T00:00:00Z'));
    expect(await estadoDe(election.id)).toBe('REGISTRO_CERRADO');

    await useCase.execute(new Date('2026-03-14T23:59:59Z'));
    expect(await estadoDe(election.id)).toBe('REGISTRO_CERRADO');

    await useCase.execute(new Date('2026-03-15T00:00:00Z'));
    expect(await estadoDe(election.id)).toBe('VOTACION_ABIERTA');

    await useCase.execute(new Date('2026-03-20T00:00:00Z'));
    expect(await estadoDe(election.id)).toBe('CERRADA');
  });

  it('avanza un solo estado por tick aunque se hayan saltado varias fechas', async () => {
    const election = await createElection({ padron: true, authorities: 5 });
    electionRepository.forceStatus(election.id, 'REGISTRO_ABIERTO');
    const muchoDespues = new Date('2026-04-01T00:00:00Z');

    await useCase.execute(muchoDespues);
    expect(await estadoDe(election.id)).toBe('REGISTRO_CERRADO');

    await useCase.execute(muchoDespues);
    expect(await estadoDe(election.id)).toBe('VOTACION_ABIERTA');

    await useCase.execute(muchoDespues);
    expect(await estadoDe(election.id)).toBe('CERRADA');
  });

  it('no toca elecciones CERRADA', async () => {
    const election = await createElection({ padron: true, authorities: 5 });
    electionRepository.forceStatus(election.id, 'CERRADA');

    await useCase.execute(new Date('2026-04-01T00:00:00Z'));

    expect(await estadoDe(election.id)).toBe('CERRADA');
  });
});
