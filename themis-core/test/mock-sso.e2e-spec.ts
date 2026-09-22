import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { hashPassword } from '../src/modules/mock-sso/infrastructure/hash.util';

describe('mock-sso (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const codigoInstitucional = `E2E-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.mockSsoUser.create({
      data: {
        codigoInstitucional,
        passwordHash: hashPassword('clave-e2e'),
        nombreCompleto: 'Usuario E2E',
        facultad: 'FICCT',
        carrera: 'INGENIERIA_SISTEMAS',
        tipoUsuario: 'ESTUDIANTE',
        estadoAcademico: 'ACTIVO',
      },
    });
  });

  afterAll(async () => {
    await prisma.mockSsoUser.deleteMany({ where: { codigoInstitucional } });
    await app.close();
  });

  it('POST /mock-sso/login responde 200 con una assertion para credenciales validas (AC-01)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/mock-sso/login')
      .send({ codigoInstitucional, password: 'clave-e2e' });

    expect(response.status).toBe(200);
    expect(typeof response.body.assertion).toBe('string');
  });

  it('POST /mock-sso/login responde 401 para credenciales invalidas (AC-02)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/mock-sso/login')
      .send({ codigoInstitucional, password: 'incorrecta' });

    expect(response.status).toBe(401);
  });

  it('la respuesta HTTP nunca expone nombreCompleto, codigoInstitucional ni passwordHash (AC-06)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/mock-sso/login')
      .send({ codigoInstitucional, password: 'clave-e2e' });

    const body = JSON.stringify(response.body);
    expect(body).not.toMatch(/nombreCompleto/i);
    expect(body).not.toMatch(/passwordHash/i);
    expect(body).not.toContain(codigoInstitucional);
  });
});
