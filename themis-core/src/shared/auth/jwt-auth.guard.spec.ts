import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestUser } from './jwt.strategy';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();
  const context = {} as ExecutionContext;

  it('deja pasar el usuario cuando passport-jwt valida el token correctamente', () => {
    const user: RequestUser = { sub: 'x', role: 'ADMIN' };
    expect(guard.handleRequest(null, user, null, context)).toBe(user);
  });

  it('lanza AUTH_SESSION_EXPIRED si passport-jwt no produce un usuario (token expirado o invalido) (AC-04)', () => {
    expect(() => guard.handleRequest(null, false, 'jwt expired', context)).toThrow(
      new UnauthorizedException('AUTH_SESSION_EXPIRED'),
    );
  });

  it('lanza AUTH_SESSION_EXPIRED si passport-jwt devuelve un error explicito', () => {
    expect(() =>
      guard.handleRequest(new Error('boom'), null, null, context),
    ).toThrow(new UnauthorizedException('AUTH_SESSION_EXPIRED'));
  });
});
