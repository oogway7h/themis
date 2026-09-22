import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginPlatformUserUseCase } from './login-platform-user.usecase';
import { InMemoryPlatformUserRepository } from '../../../../test/doubles/in-memory-platform-user.repository';
import { hashPassword } from '../infrastructure/password.util';

const JWT_SECRET = 'test-secret-de-al-menos-16-caracteres';

describe('LoginPlatformUserUseCase', () => {
  let repository: InMemoryPlatformUserRepository;
  let useCase: LoginPlatformUserUseCase;

  beforeEach(async () => {
    repository = new InMemoryPlatformUserRepository();
    const jwtService = new JwtService({ secret: JWT_SECRET });
    useCase = new LoginPlatformUserUseCase(repository, jwtService);

    await repository.create({
      email: 'admin@test.dev',
      passwordHash: await hashPassword('clave-correcta'),
      nombreCompleto: 'Admin de Prueba',
      role: 'ADMIN',
    });

    await repository.create({
      email: 'autoridad@test.dev',
      passwordHash: await hashPassword('clave-correcta'),
      nombreCompleto: 'Autoridad de Prueba',
      role: 'AUTORIDAD_REGISTRO',
    });

    await repository.create({
      email: 'auditor@test.dev',
      passwordHash: await hashPassword('clave-correcta'),
      nombreCompleto: 'Auditor de Prueba',
      role: 'AUDITOR',
    });
  });

  it.each([
    ['admin@test.dev', 'ADMIN'],
    ['autoridad@test.dev', 'AUTORIDAD_REGISTRO'],
    ['auditor@test.dev', 'AUDITOR'],
  ] as const)(
    'login valido de %s emite un JWT con sub y role=%s (AC-01)',
    async (email, expectedRole) => {
      const result = await useCase.execute({
        email,
        password: 'clave-correcta',
      });

      expect(result.role).toBe(expectedRole);

      const decoded = new JwtService({ secret: JWT_SECRET }).decode(
        result.accessToken,
      ) as { sub: string; role: string; exp: number };

      expect(decoded.role).toBe(expectedRole);
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    },
  );

  it('rechaza un email inexistente con AUTH_INVALID_CREDENTIALS (AC-02)', async () => {
    await expect(
      useCase.execute({ email: 'no-existe@test.dev', password: 'x' }),
    ).rejects.toMatchObject(
      new UnauthorizedException('AUTH_INVALID_CREDENTIALS'),
    );
  });

  it('rechaza una contraseña incorrecta con el mismo error que un email inexistente (AC-02)', async () => {
    await expect(
      useCase.execute({ email: 'admin@test.dev', password: 'incorrecta' }),
    ).rejects.toMatchObject(
      new UnauthorizedException('AUTH_INVALID_CREDENTIALS'),
    );
  });

  it('rechaza una cuenta desactivada (soft-delete) con el mismo error que credenciales invalidas', async () => {
    const user = await repository.findByEmail('admin@test.dev');
    await repository.softDelete(user!.id);

    await expect(
      useCase.execute({ email: 'admin@test.dev', password: 'clave-correcta' }),
    ).rejects.toMatchObject(
      new UnauthorizedException('AUTH_INVALID_CREDENTIALS'),
    );
  });

  it('el JWT firmado nunca incluye email, passwordHash ni nombreCompleto en el payload', async () => {
    const result = await useCase.execute({
      email: 'admin@test.dev',
      password: 'clave-correcta',
    });

    const decoded = new JwtService({ secret: JWT_SECRET }).decode(
      result.accessToken,
    ) as Record<string, unknown>;

    expect(decoded).not.toHaveProperty('email');
    expect(decoded).not.toHaveProperty('passwordHash');
    expect(decoded).not.toHaveProperty('nombreCompleto');
  });
});
