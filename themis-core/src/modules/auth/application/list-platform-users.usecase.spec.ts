import { ListPlatformUsersUseCase } from './list-platform-users.usecase';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';

describe('ListPlatformUsersUseCase', () => {
  let repository: InMemoryPlatformUserRepository;
  let useCase: ListPlatformUsersUseCase;

  beforeEach(async () => {
    repository = new InMemoryPlatformUserRepository();
    useCase = new ListPlatformUsersUseCase(repository);

    for (let i = 1; i <= 5; i += 1) {
      await repository.create({
        email: `usuario-${i}@test.dev`,
        passwordHash: 'hash',
        nombreCompleto: `Usuario ${i}`,
        role: 'ADMIN',
      });
    }
  });

  it('pagina los resultados segun page/pageSize (AC de la HU de gestion de usuarios)', async () => {
    const page1 = await useCase.execute({ page: 1, pageSize: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(2);

    const page3 = await useCase.execute({ page: 3, pageSize: 2 });
    expect(page3.data).toHaveLength(1);
  });

  it('no incluye cuentas desactivadas (soft-delete)', async () => {
    const [target] = (await repository.findAllActive({ skip: 0, take: 1 })).items;
    await repository.softDelete(target.id);

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result.total).toBe(4);
    expect(result.data.find((user) => user.id === target.id)).toBeUndefined();
  });
});
