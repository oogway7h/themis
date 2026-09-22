import { NotFoundException } from '@nestjs/common';
import { DeactivatePlatformUserUseCase } from './deactivate-platform-user.usecase';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';

describe('DeactivatePlatformUserUseCase', () => {
  let repository: InMemoryPlatformUserRepository;
  let useCase: DeactivatePlatformUserUseCase;

  beforeEach(() => {
    repository = new InMemoryPlatformUserRepository();
    useCase = new DeactivatePlatformUserUseCase(repository);
  });

  it('desactiva (soft-delete) una cuenta existente', async () => {
    const user = await repository.create({
      email: 'auditor@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Auditor',
      role: 'AUDITOR',
    });

    await useCase.execute(user.id);

    const found = await repository.findById(user.id);
    expect(found?.isActive).toBe(false);
  });

  it('lanza 404 si la cuenta no existe', async () => {
    await expect(useCase.execute('no-existe')).rejects.toMatchObject(
      new NotFoundException('AUTH_USER_NOT_FOUND'),
    );
  });

  it('lanza 404 si la cuenta ya estaba desactivada', async () => {
    const user = await repository.create({
      email: 'auditor@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Auditor',
      role: 'AUDITOR',
    });
    await repository.softDelete(user.id);

    await expect(useCase.execute(user.id)).rejects.toMatchObject(
      new NotFoundException('AUTH_USER_NOT_FOUND'),
    );
  });

  it('lanza 404 si la cuenta es SUPERUSUARIO (no desactivable por esta ruta)', async () => {
    const superuser = await repository.create({
      email: 'super@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Super',
      role: 'SUPERUSUARIO',
    });

    await expect(useCase.execute(superuser.id)).rejects.toMatchObject(
      new NotFoundException('AUTH_USER_NOT_FOUND'),
    );
  });
});
