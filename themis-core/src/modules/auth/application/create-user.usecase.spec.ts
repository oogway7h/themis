import { ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.usecase';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';
import { verifyPassword } from '../infrastructure/password.util';

describe('CreateUserUseCase', () => {
  let repository: InMemoryPlatformUserRepository;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    repository = new InMemoryPlatformUserRepository();
    useCase = new CreateUserUseCase(repository);
  });

  it.each(['ADMIN', 'AUTORIDAD_REGISTRO', 'AUDITOR'] as const)(
    'crea una cuenta con role=%s y guarda el password hasheado',
    async (role) => {
      const user = await useCase.execute({
        email: `nueva.${role.toLowerCase()}@themis.dev`,
        password: 'unaClaveSegura123',
        nombreCompleto: 'Cuenta de Prueba',
        role,
      });

      expect(user.role).toBe(role);
      expect(user.passwordHash).not.toBe('unaClaveSegura123');
      expect(
        await verifyPassword('unaClaveSegura123', user.passwordHash),
      ).toBe(true);
    },
  );

  it('lanza ConflictException si el email ya existe', async () => {
    await useCase.execute({
      email: 'repetido@themis.dev',
      password: 'unaClaveSegura123',
      nombreCompleto: 'Primera Cuenta',
      role: 'ADMIN',
    });

    await expect(
      useCase.execute({
        email: 'repetido@themis.dev',
        password: 'otraClaveSegura123',
        nombreCompleto: 'Segunda Cuenta',
        role: 'AUDITOR',
      }),
    ).rejects.toMatchObject(new ConflictException('AUTH_EMAIL_ALREADY_EXISTS'));
  });
});
