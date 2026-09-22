import { UnauthorizedException } from '@nestjs/common';
import { GetMeUseCase } from './get-me.usecase';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';

describe('GetMeUseCase', () => {
  let repository: InMemoryPlatformUserRepository;
  let useCase: GetMeUseCase;

  beforeEach(() => {
    repository = new InMemoryPlatformUserRepository();
    useCase = new GetMeUseCase(repository);
  });

  it('devuelve sub/role/nombreCompleto de una cuenta activa', async () => {
    const user = await repository.create({
      email: 'admin@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Admin de Prueba',
      role: 'ADMIN',
    });

    const result = await useCase.execute(user.id);

    expect(result).toEqual({
      sub: user.id,
      role: 'ADMIN',
      nombreCompleto: 'Admin de Prueba',
    });
  });

  it('lanza AUTH_SESSION_EXPIRED si la cuenta ya no existe', async () => {
    await expect(useCase.execute('id-inexistente')).rejects.toMatchObject(
      new UnauthorizedException('AUTH_SESSION_EXPIRED'),
    );
  });

  it('lanza AUTH_SESSION_EXPIRED si la cuenta fue desactivada (soft-delete) despues de emitido el JWT', async () => {
    const user = await repository.create({
      email: 'admin@test.dev',
      passwordHash: 'hash',
      nombreCompleto: 'Admin de Prueba',
      role: 'ADMIN',
    });
    await repository.softDelete(user.id);

    await expect(useCase.execute(user.id)).rejects.toMatchObject(
      new UnauthorizedException('AUTH_SESSION_EXPIRED'),
    );
  });
});
