import { CreateElectionUseCase } from './create-election.usecase';
import { DesignateAuthoritiesUseCase } from './designate-authorities.usecase';
import {
  AuthorityQuotaInvalidError,
  AuthorityAccountInvalidRoleError,
  AuthorityAccountInactiveError,
  AuthorityAlreadyDesignatedError,
  AuthorityElectionClosedError,
} from './election.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryAuthorityRepository } from '../../../../test/doubles/in-memory-authority.repository';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';

describe('DesignateAuthoritiesUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let authorityRepository: InMemoryAuthorityRepository;
  let platformUserRepository: InMemoryPlatformUserRepository;
  let createElectionUseCase: CreateElectionUseCase;
  let useCase: DesignateAuthoritiesUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    authorityRepository = new InMemoryAuthorityRepository();
    platformUserRepository = new InMemoryPlatformUserRepository();
    createElectionUseCase = new CreateElectionUseCase(electionRepository);
    useCase = new DesignateAuthoritiesUseCase(
      electionRepository,
      authorityRepository,
      platformUserRepository,
    );
  });

  async function createElection() {
    return createElectionUseCase.execute(
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

  async function createAuthorityAccounts(count: number, role: 'AUTORIDAD_REGISTRO' | 'AUDITOR' = 'AUTORIDAD_REGISTRO') {
    const accounts = [];
    for (let i = 0; i < count; i += 1) {
      accounts.push(
        await platformUserRepository.create({
          email: `autoridad-${i}@themis.dev`,
          passwordHash: 'hash',
          nombreCompleto: `Autoridad ${i}`,
          role,
        }),
      );
    }
    return accounts;
  }

  it('designa exactamente 5 autoridades válidas (AC-01)', async () => {
    const election = await createElection();
    const accounts = await createAuthorityAccounts(5);

    const authorities = await useCase.execute(
      election.id,
      accounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' })),
      'admin-1',
    );

    expect(authorities).toHaveLength(5);
  });

  it('rechaza un arreglo que no tenga exactamente 5 (AC-02)', async () => {
    const election = await createElection();
    const accounts = await createAuthorityAccounts(4);

    await expect(
      useCase.execute(
        election.id,
        accounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' })),
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(AuthorityQuotaInvalidError);
  });

  it('rechaza una cuenta repetida en el mismo arreglo (AC-02)', async () => {
    const election = await createElection();
    const accounts = await createAuthorityAccounts(4);
    const inputs = [
      ...accounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' })),
      { platformUserId: accounts[0].id, rolDescriptivo: 'Rol duplicado' },
    ];

    await expect(useCase.execute(election.id, inputs, 'admin-1')).rejects.toBeInstanceOf(
      AuthorityQuotaInvalidError,
    );
  });

  it('rechaza una cuenta que no tiene rol AUTORIDAD_REGISTRO (AC-02)', async () => {
    const election = await createElection();
    const validAccounts = await createAuthorityAccounts(4);
    const invalidAccount = (await createAuthorityAccounts(1, 'AUDITOR'))[0];

    const inputs = [
      ...validAccounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' })),
      { platformUserId: invalidAccount.id, rolDescriptivo: 'Rol' },
    ];

    await expect(useCase.execute(election.id, inputs, 'admin-1')).rejects.toBeInstanceOf(
      AuthorityAccountInvalidRoleError,
    );
  });

  it('rechaza una cuenta desactivada (AC-02)', async () => {
    const election = await createElection();
    const accounts = await createAuthorityAccounts(5);
    await platformUserRepository.softDelete(accounts[0].id);

    await expect(
      useCase.execute(
        election.id,
        accounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' })),
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(AuthorityAccountInactiveError);
  });

  it('rechaza designar una cuenta ya designada en la misma elección (AC-02)', async () => {
    const election = await createElection();
    const accounts = await createAuthorityAccounts(5);
    const inputs = accounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' }));
    await useCase.execute(election.id, inputs, 'admin-1');

    const otherElection = await createElectionUseCase.execute(
      {
        nombre: 'Otra elección',
        registroInicio: new Date('2026-02-01T00:00:00Z'),
        registroFin: new Date('2026-02-10T00:00:00Z'),
        votacionInicio: new Date('2026-02-10T00:00:00Z'),
        votacionFin: new Date('2026-02-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );
    // Redesignar las mismas 5 cuentas en otra elección debe funcionar (AC-05, scope por elección).
    await expect(useCase.execute(otherElection.id, inputs, 'admin-1')).resolves.toHaveLength(5);

    // Pero repetir la designación en la MISMA elección debe fallar.
    await expect(useCase.execute(election.id, inputs, 'admin-1')).rejects.toBeInstanceOf(
      AuthorityAlreadyDesignatedError,
    );
  });

  it('rechaza designar si la elección ya tiene autoridades, aunque las cuentas sean nuevas (AC-02)', async () => {
    const election = await createElection();
    const accounts = await createAuthorityAccounts(10);
    const toInputs = (list: typeof accounts) =>
      list.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' }));
    await useCase.execute(election.id, toInputs(accounts.slice(0, 5)), 'admin-1');

    await expect(
      useCase.execute(election.id, toInputs(accounts.slice(5)), 'admin-1'),
    ).rejects.toBeInstanceOf(AuthorityAlreadyDesignatedError);
    expect(await authorityRepository.findByElection(election.id)).toHaveLength(5);
  });

  it('rechaza designar autoridades en una elección CERRADA (AC-06)', async () => {
    const election = await createElection();
    electionRepository.forceStatus(election.id, 'CERRADA');
    const accounts = await createAuthorityAccounts(5);

    await expect(
      useCase.execute(
        election.id,
        accounts.map((account) => ({ platformUserId: account.id, rolDescriptivo: 'Rol' })),
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(AuthorityElectionClosedError);
  });
});
