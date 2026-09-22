import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RequestUser } from './jwt.strategy';

function buildContext(user?: RequestUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite el paso si el endpoint no declara @Roles(...) (AC-03)', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ sub: 'x', role: 'ADMIN' }))).toBe(
      true,
    );
  });

  it('permite el paso si el rol de la sesion esta entre los roles requeridos (AC-03)', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ sub: 'x', role: 'ADMIN' }))).toBe(
      true,
    );
  });

  it('rechaza con 403 (AUTH_FORBIDDEN_ROLE) si el rol no esta autorizado (AC-03)', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(buildContext({ sub: 'x', role: 'AUDITOR' })),
    ).toThrow(new ForbiddenException('AUTH_FORBIDDEN_ROLE'));
  });

  it('rechaza con 403 si no hay usuario en el request (sesion ausente antes de este guard)', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
