import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { APP_CONFIG } from '../src/config/configuration';
import type { AppConfig } from '../src/config/configuration';
import { hashPassword } from '../src/modules/auth/infrastructure/password.util';
import { ACCESS_TOKEN_COOKIE } from '../src/shared/auth/auth-cookie';

function extractCookie(setCookieHeader: string[] | undefined): string {
  const raw = (setCookieHeader ?? []).find((c) =>
    c.startsWith(`${ACCESS_TOKEN_COOKIE}=`),
  );
  if (!raw) {
    throw new Error('No se encontro la cookie access_token en la respuesta');
  }
  return raw.split(';')[0];
}

describe('auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let config: AppConfig;
  const email = `e2e-auth-${Date.now()}@themis.dev`;
  const superusuarioEmail = `e2e-superusuario-${Date.now()}@themis.dev`;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    config = app.get<AppConfig>(APP_CONFIG);

    await prisma.platformUser.create({
      data: {
        email,
        passwordHash: await hashPassword('clave-e2e'),
        nombreCompleto: 'Usuario E2E Auth',
        role: 'ADMIN',
      },
    });

    await prisma.platformUser.create({
      data: {
        email: superusuarioEmail,
        passwordHash: await hashPassword('clave-e2e'),
        nombreCompleto: 'Superusuario E2E Auth',
        role: 'SUPERUSUARIO',
      },
    });
  });

  afterAll(async () => {
    await prisma.platformUser.deleteMany({
      where: { email: { in: [email, superusuarioEmail, ...createdEmails] } },
    });
    await app.close();
  });

  it('POST /auth/login responde 200 con role/nombreCompleto y una cookie httpOnly access_token (AC-01)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'clave-e2e' });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('ADMIN');
    expect(response.body.nombreCompleto).toBe('Usuario E2E Auth');
    expect(response.body.accessToken).toBeUndefined();

    const cookieHeader = (response.headers['set-cookie'] as unknown as
      | string[]
      | undefined) ?? [];
    const authCookie = cookieHeader.find((c) =>
      c.startsWith(`${ACCESS_TOKEN_COOKIE}=`),
    );
    expect(authCookie).toBeDefined();
    expect(authCookie).toMatch(/HttpOnly/i);
  });

  it('POST /auth/login responde 401 para credenciales invalidas (AC-02)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'incorrecta' });

    expect(response.status).toBe(401);
  });

  it('GET /auth/me responde 200 con la sesion cuando la cookie es valida', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'clave-e2e' });

    const cookie = extractCookie(
      login.headers['set-cookie'] as unknown as string[] | undefined,
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('ADMIN');
    expect(response.body.nombreCompleto).toBe('Usuario E2E Auth');
  });

  it('GET /auth/me responde 401 sin cookie', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
  });

  it('GET /auth/me responde 401 con una cookie de token expirado (AC-04)', async () => {
    const jwtService = new JwtService({ secret: config.jwt.secret });
    const expiredToken = await jwtService.signAsync(
      { sub: 'x', role: 'ADMIN' },
      { expiresIn: '-10s' },
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${expiredToken}`);

    expect(response.status).toBe(401);
  });

  it('POST /auth/logout limpia la cookie de sesion', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'clave-e2e' });

    const cookie = extractCookie(
      login.headers['set-cookie'] as unknown as string[] | undefined,
    );

    const logout = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie);

    expect(logout.status).toBe(200);
    const clearedCookie = (logout.headers['set-cookie'] as unknown as
      | string[]
      | undefined) ?? [];
    const cleared = clearedCookie.find((c) =>
      c.startsWith(`${ACCESS_TOKEN_COOKIE}=`),
    );
    // clearCookie envia el valor vacio con Expires en el pasado.
    expect(cleared).toMatch(new RegExp(`${ACCESS_TOKEN_COOKIE}=;`));
  });

  it('POST /auth/register no existe (AC-05, sin auto-registro)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'nuevo@themis.dev', password: 'x' });

    expect(response.status).toBe(404);
  });

  describe('POST /auth/users', () => {
    async function loginAs(loginEmail: string, password: string) {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: loginEmail, password });

      return extractCookie(
        login.headers['set-cookie'] as unknown as string[] | undefined,
      );
    }

    it('un SUPERUSUARIO puede crear una cuenta ADMIN/AUTORIDAD_REGISTRO/AUDITOR', async () => {
      const cookie = await loginAs(superusuarioEmail, 'clave-e2e');
      const newEmail = `e2e-creada-${Date.now()}@themis.dev`;
      createdEmails.push(newEmail);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .set('Cookie', cookie)
        .send({
          email: newEmail,
          password: 'unaClaveSegura123',
          nombreCompleto: 'Cuenta Creada E2E',
          role: 'AUTORIDAD_REGISTRO',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        email: newEmail,
        nombreCompleto: 'Cuenta Creada E2E',
        role: 'AUTORIDAD_REGISTRO',
      });
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('responde 403 si el solicitante no es SUPERUSUARIO', async () => {
      const cookie = await loginAs(email, 'clave-e2e');

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .set('Cookie', cookie)
        .send({
          email: `e2e-rechazada-${Date.now()}@themis.dev`,
          password: 'unaClaveSegura123',
          nombreCompleto: 'No Deberia Crearse',
          role: 'AUDITOR',
        });

      expect(response.status).toBe(403);
    });

    it('responde 401 sin cookie de sesion', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .send({
          email: `e2e-sin-sesion-${Date.now()}@themis.dev`,
          password: 'unaClaveSegura123',
          nombreCompleto: 'Sin Sesion',
          role: 'AUDITOR',
        });

      expect(response.status).toBe(401);
    });

    it('responde 400 si se intenta crear otro SUPERUSUARIO', async () => {
      const cookie = await loginAs(superusuarioEmail, 'clave-e2e');

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .set('Cookie', cookie)
        .send({
          email: `e2e-otro-super-${Date.now()}@themis.dev`,
          password: 'unaClaveSegura123',
          nombreCompleto: 'Otro Superusuario',
          role: 'SUPERUSUARIO',
        });

      expect(response.status).toBe(400);
    });

    it('responde 409 si el email ya existe', async () => {
      const cookie = await loginAs(superusuarioEmail, 'clave-e2e');

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .set('Cookie', cookie)
        .send({
          email, // ya sembrado en beforeAll
          password: 'unaClaveSegura123',
          nombreCompleto: 'Email Repetido',
          role: 'AUDITOR',
        });

      expect(response.status).toBe(409);
    });
  });
});
