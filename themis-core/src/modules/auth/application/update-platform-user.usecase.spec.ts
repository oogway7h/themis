import { NotFoundException } from '@nestjs/common';
import { UpdatePlatformUserUseCase } from './update-platform-user.usecase';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';

describe('UpdatePlatformUserUseCase', () => {
  let repository: InMemoryPlatformUserRepository;
  let useCase: UpdatePlatformUserUseCase;

  beforeEach(() => {
    repository = new InMemoryPlatformUserRepository();
    useCase = new UpdatePlatformUserUseCase(repository);
  });

  it('actualiza nombreCompleto y role de una cuenta existente', async () => {
    const user = await repository.create({
      email: 'autoridad@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Nombre Viejo',
      role: 'AUTORIDAD_REGISTRO',
    });

    const updated = await useCase.execute({
      id: user.id,
      nombreCompleto: 'Nombre Nuevo',
      role: 'AUDITOR',
    });

    expect(updated.nombreCompleto).toBe('Nombre Nuevo');
    expect(updated.role).toBe('AUDITOR');
  });

  it('lanza 404 si la cuenta no existe', async () => {
    await expect(
      useCase.execute({ id: 'no-existe', nombreCompleto: 'X', role: 'ADMIN' }),
    ).rejects.toMatchObject(new NotFoundException('AUTH_USER_NOT_FOUND'));
  });

  it('lanza 404 si la cuenta ya esta desactivada', async () => {
    const user = await repository.create({
      email: 'admin@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Admin',
      role: 'ADMIN',
    });
    await repository.softDelete(user.id);

    await expect(
      useCase.execute({ id: user.id, nombreCompleto: 'X', role: 'ADMIN' }),
    ).rejects.toMatchObject(new NotFoundException('AUTH_USER_NOT_FOUND'));
  });

  it('lanza 404 si la cuenta es SUPERUSUARIO (no editable por esta ruta)', async () => {
    const superuser = await repository.create({
      email: 'super@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Super',
      role: 'SUPERUSUARIO',
    });

    await expect(
      useCase.execute({ id: superuser.id, nombreCompleto: 'X', role: 'ADMIN' }),
    ).rejects.toMatchObject(new NotFoundException('AUTH_USER_NOT_FOUND'));
  });
});
