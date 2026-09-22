import { CreateElectionUseCase } from './create-election.usecase';
import { DesignateAuthoritiesUseCase } from './designate-authorities.usecase';
import { ReplaceAuthorityUseCase } from './replace-authority.usecase';
import {
  AuthorityNotFoundError,
  AuthorityAlreadyDesignatedError,
  AuthorityElectionClosedError,
} from './election.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryAuthorityRepository } from '../../../../test/doubles/in-memory-authority.repository';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';

describe('ReplaceAuthorityUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let authorityRepository: InMemoryAuthorityRepository;
  let platformUserRepository: InMemoryPlatformUserRepository;
  let createElectionUseCase: CreateElectionUseCase;
  let designate: DesignateAuthoritiesUseCase;
  let useCase: ReplaceAuthorityUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    authorityRepository = new InMemoryAuthorityRepository();
    platformUserRepository = new InMemoryPlatformUserRepository();
    createElectionUseCase = new CreateElectionUseCase(electionRepository);
    designate = new DesignateAuthoritiesUseCase(
      electionRepository,
      authorityRepository,
      platformUserRepository,
    );
    useCase = new ReplaceAuthorityUseCase(
      authorityRepository,
      electionRepository,
      platformUserRepository,
    );
  });

  function createElection(nombre: string) {
    return createElectionUseCase.execute(
      {
        nombre,
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );
  }

  async function createAccounts(count: number) {
    const accounts = [];
    for (let i = 0; i < count; i += 1) {
      accounts.push(
        await platformUserRepository.create({
          email: `autoridad-${i}@themis.dev`,
          passwordHash: 'hash',
          nombreCompleto: `Autoridad ${i}`,
          role: 'AUTORIDAD_REGISTRO',
        }),
      );
    }
    return accounts;
  }

  async function setup() {
    const election = await createElection('Elección A');
    const accounts = await createAccounts(6);
    const designated = await designate.execute(
      election.id,
      accounts.slice(0, 5).map((a) => ({ platformUserId: a.id, rolDescriptivo: 'Rol' })),
      'admin-1',
    );
    return { election, accounts, designated };
  }

  it('reemplaza la cuenta y registra updatedBy (AC-04, AC-07)', async () => {
    const { election, accounts, designated } = await setup();

    const result = await useCase.execute(
      election.id,
      designated[0].id,
      { platformUserId: accounts[5].id },
      'admin-2',
    );

    expect(result.platformUserEmail).toBe(accounts[5].email);
    expect((await authorityRepository.findById(designated[0].id))?.updatedBy).toBe('admin-2');
    expect(await authorityRepository.findByElection(election.id)).toHaveLength(5);
  });

  it('404 si la autoridad pertenece a otra elección (AC-05)', async () => {
    const { designated, accounts } = await setup();
    const other = await createElection('Elección B');

    await expect(
      useCase.execute(other.id, designated[0].id, { platformUserId: accounts[5].id }, 'admin-2'),
    ).rejects.toBeInstanceOf(AuthorityNotFoundError);
    expect((await authorityRepository.findById(designated[0].id))?.platformUserId).toBe(
      accounts[0].id,
    );
  });

  it('409 si la cuenta nueva ya está designada en la misma elección', async () => {
    const { election, accounts, designated } = await setup();

    await expect(
      useCase.execute(election.id, designated[0].id, { platformUserId: accounts[2].id }, 'admin-2'),
    ).rejects.toBeInstanceOf(AuthorityAlreadyDesignatedError);
  });

  it('409 si la constraint única salta en el repositorio (P2002)', async () => {
    const { election, accounts, designated } = await setup();
    jest
      .spyOn(authorityRepository, 'replace')
      .mockRejectedValueOnce(
        Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
      );

    await expect(
      useCase.execute(election.id, designated[0].id, { platformUserId: accounts[5].id }, 'admin-2'),
    ).rejects.toBeInstanceOf(AuthorityAlreadyDesignatedError);
  });

  it('rechaza reemplazar en una elección CERRADA (AC-06)', async () => {
    const { election, accounts, designated } = await setup();
    electionRepository.forceStatus(election.id, 'CERRADA');

    await expect(
      useCase.execute(election.id, designated[0].id, { platformUserId: accounts[5].id }, 'admin-2'),
    ).rejects.toBeInstanceOf(AuthorityElectionClosedError);
  });
});
