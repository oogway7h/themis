import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { hashPassword } from '../src/modules/auth/infrastructure/password.util';
import { ACCESS_TOKEN_COOKIE } from '../src/shared/auth/auth-cookie';
import { DomainErrorFilter } from '../src/shared/errors/domain-error.filter';

function extractCookie(setCookieHeader: string[] | undefined): string {
  const raw = (setCookieHeader ?? []).find((c) => c.startsWith(`${ACCESS_TOKEN_COOKIE}=`));
  if (!raw) {
    throw new Error('No se encontro la cookie access_token en la respuesta');
  }
  return raw.split(';')[0];
}

describe('elections (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = Date.now();
  const adminEmail = `e2e-elections-admin-${suffix}@themis.dev`;
  const autoridadEmail = `e2e-elections-autoridad-${suffix}@themis.dev`;
  const auditorEmail = `e2e-elections-auditor-${suffix}@themis.dev`;
  let adminCookie: string;
  let auditorCookie: string;
  const authorityAccountIds: string[] = [];
  const authorityEmails: string[] = [];

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new DomainErrorFilter());
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.platformUser.create({
      data: {
        email: adminEmail,
        passwordHash: await hashPassword('clave-e2e'),
        nombreCompleto: 'Admin E2E Elections',
        role: 'ADMIN',
      },
    });
    await prisma.platformUser.create({
      data: {
        email: auditorEmail,
        passwordHash: await hashPassword('clave-e2e'),
        nombreCompleto: 'Auditor E2E Elections',
        role: 'AUDITOR',
      },
    });

    for (let i = 0; i < 6; i += 1) {
      const email = `e2e-elections-autoridad-${suffix}-${i}@themis.dev`;
      authorityEmails.push(email);
      const account = await prisma.platformUser.create({
        data: {
          email,
          passwordHash: await hashPassword('clave-e2e'),
          nombreCompleto: `Autoridad E2E ${i}`,
          role: 'AUTORIDAD_REGISTRO',
        },
      });
      authorityAccountIds.push(account.id);
    }

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'clave-e2e' });
    adminCookie = extractCookie(adminLogin.headers['set-cookie'] as unknown as string[] | undefined);

    const auditorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: auditorEmail, password: 'clave-e2e' });
    auditorCookie = extractCookie(
      auditorLogin.headers['set-cookie'] as unknown as string[] | undefined,
    );
  });

  afterAll(async () => {
    await prisma.election.deleteMany({
      where: { nombre: { contains: String(suffix) } },
    });
    await prisma.platformUser.deleteMany({
      where: { email: { in: [adminEmail, auditorEmail, ...authorityEmails] } },
    });
    await app.close();
  });

  function baseElectionPayload(overrides: Record<string, unknown> = {}) {
    return {
      nombre: `Representante FICCT ${suffix}`,
      registroInicio: '2026-01-01T00:00:00.000Z',
      registroFin: '2026-01-10T00:00:00.000Z',
      votacionInicio: '2026-01-10T00:00:00.000Z',
      votacionFin: '2026-01-12T00:00:00.000Z',
      opciones: [{ nombre: 'Candidatura A' }, { nombre: 'Candidatura B' }],
      ...overrides,
    };
  }

  let electionId: string;

  describe('CRUD de elecciones (HU-01)', () => {
    it('401 sin sesion', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .send(baseElectionPayload());
      expect(response.status).toBe(401);
    });

    it('403 con sesion de un rol distinto de ADMIN (AC-07)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .set('Cookie', auditorCookie)
        .send(baseElectionPayload());
      expect(response.status).toBe(403);
    });

    it('crea una eleccion en BORRADOR con SEMAPHORE/umbral 3 (AC-01, AC-04)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .set('Cookie', adminCookie)
        .send(baseElectionPayload());

      expect(response.status).toBe(201);
      expect(response.body.estado).toBe('BORRADOR');
      expect(response.body.mecanismoCriptografico).toBe('SEMAPHORE');
      expect(response.body.umbralFirmas).toBe(3);
      expect(response.body.opciones).toHaveLength(2);
      electionId = response.body.id;
    });

    it('400 con fechas incoherentes (AC-02)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .set('Cookie', adminCookie)
        .send(baseElectionPayload({ votacionInicio: '2026-01-05T00:00:00.000Z' }));

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ELECTION_INVALID_DATE_RANGE');
    });

    it('400 con menos de 2 opciones (AC-03)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .set('Cookie', adminCookie)
        .send(baseElectionPayload({ opciones: [{ nombre: 'Sola' }] }));

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ELECTION_MIN_OPTIONS');
    });

    it('filtra el listado por estado (AC-06)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/elections?estado=BORRADOR')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.some((e: { id: string }) => e.id === electionId)).toBe(true);
    });

    it('edita una eleccion en BORRADOR (AC-05)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/elections/${electionId}`)
        .set('Cookie', adminCookie)
        .send({ nombre: `Representante FICCT ${suffix} (editado)` });

      expect(response.status).toBe(200);
      expect(response.body.nombre).toContain('editado');
    });
  });

  describe('Padron y arbol de Merkle (HU-02)', () => {
    it('configura profundidad y elegibilidad, calculando capacidadMaxima (AC-01, AC-02)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/elections/${electionId}/roll-config`)
        .set('Cookie', adminCookie)
        .send({
          profundidadArbol: 13,
          elegibilidadFacultad: 'FICCT',
          elegibilidadCarreras: [],
          elegibilidadTipoUsuario: 'ESTUDIANTE',
          elegibilidadEstadoAcademico: 'ACTIVO',
        });

      expect(response.status).toBe(200);
      expect(response.body.profundidadArbol).toBe(13);
      expect(response.body.capacidadMaxima).toBe(String(2 ** 13));
      expect(response.body.padronConfiguradoEn).not.toBeNull();
    });

    it('400 con profundidad fuera de [4, 20]', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/elections/${electionId}/roll-config`)
        .set('Cookie', adminCookie)
        .send({
          profundidadArbol: 3,
          elegibilidadFacultad: 'FICCT',
          elegibilidadTipoUsuario: 'ESTUDIANTE',
          elegibilidadEstadoAcademico: 'ACTIVO',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ELECTION_TREE_DEPTH_OUT_OF_RANGE');
    });

    it('GET sin configurar devuelve null (AC-05)', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .set('Cookie', adminCookie)
        .send(baseElectionPayload({ nombre: `Representante FICCT sin padron ${suffix}` }));

      const response = await request(app.getHttpServer())
        .get(`/api/v1/elections/${created.body.id}/roll-config`)
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.profundidadArbol).toBeNull();
    });
  });

  describe('Autoridades de registro (HU-03)', () => {
    it('403 si no es ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', auditorCookie)
        .send({ autoridades: [] });
      expect(response.status).toBe(403);
    });

    it('400 si el arreglo no tiene exactamente 5 (AC-02)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', adminCookie)
        .send({
          autoridades: authorityAccountIds
            .slice(0, 4)
            .map((id) => ({ platformUserId: id, rolDescriptivo: 'Rol' })),
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('AUTHORITY_QUOTA_INVALID');
    });

    it('designa 5 autoridades validas exponiendo solo rol y email (AC-01, AC-03)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', adminCookie)
        .send({
          autoridades: authorityAccountIds
            .slice(0, 5)
            .map((id) => ({ platformUserId: id, rolDescriptivo: 'Profesor titular' })),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveLength(5);
      for (const authority of response.body) {
        expect(authority.rolDescriptivo).toBeDefined();
        expect(authority.platformUserEmail).toBeDefined();
        expect(authority.nombreCompleto).toBeUndefined();
      }
    });

    it('409 al designar de nuevo (cuenta ya designada) (AC-02)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', adminCookie)
        .send({
          autoridades: authorityAccountIds
            .slice(0, 5)
            .map((id) => ({ platformUserId: id, rolDescriptivo: 'Rol' })),
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('AUTHORITY_ALREADY_DESIGNATED');
    });

    it('reemplaza una autoridad sin duplicar filas (AC-04)', async () => {
      const list = await request(app.getHttpServer())
        .get(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', adminCookie);
      const [first] = list.body;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/elections/${electionId}/authorities/${first.id}`)
        .set('Cookie', adminCookie)
        .send({ platformUserId: authorityAccountIds[5], rolDescriptivo: 'Delegado estudiantil' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(first.id);
      expect(response.body.rolDescriptivo).toBe('Delegado estudiantil');

      const listAfter = await request(app.getHttpServer())
        .get(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', adminCookie);
      expect(listAfter.body).toHaveLength(5);
    });

    it('409 al reemplazar con una cuenta ya designada en la misma elección', async () => {
      const list = await request(app.getHttpServer())
        .get(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', adminCookie);
      const [first, second] = list.body;
      const secondAccount = await prisma.platformUser.findUnique({
        where: { email: second.platformUserEmail },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/elections/${electionId}/authorities/${first.id}`)
        .set('Cookie', adminCookie)
        .send({ platformUserId: secondAccount!.id });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('AUTHORITY_ALREADY_DESIGNATED');
    });

    it('404 al reemplazar una autoridad usando la ruta de otra elección (AC-05)', async () => {
      const other = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .set('Cookie', adminCookie)
        .send(baseElectionPayload({ nombre: `Otra eleccion ${suffix}` }));
      const list = await request(app.getHttpServer())
        .get(`/api/v1/elections/${electionId}/authorities`)
        .set('Cookie', adminCookie);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/elections/${other.body.id}/authorities/${list.body[0].id}`)
        .set('Cookie', adminCookie)
        .send({ rolDescriptivo: 'Intruso' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('AUTHORITY_NOT_FOUND');
    });

    it('409 al designar 5 cuentas nuevas si la elección ya tiene autoridades (AC-02)', async () => {
      const extraEmails: string[] = [];
      const extraIds: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        const email = `e2e-elections-extra-${suffix}-${i}@themis.dev`;
        extraEmails.push(email);
        const account = await prisma.platformUser.create({
          data: {
            email,
            passwordHash: await hashPassword('clave-e2e'),
            nombreCompleto: `Extra E2E ${i}`,
            role: 'AUTORIDAD_REGISTRO',
          },
        });
        extraIds.push(account.id);
      }

      try {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/elections/${electionId}/authorities`)
          .set('Cookie', adminCookie)
          .send({
            autoridades: extraIds.map((id) => ({ platformUserId: id, rolDescriptivo: 'Rol' })),
          });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe('AUTHORITY_ALREADY_DESIGNATED');

        const list = await request(app.getHttpServer())
          .get(`/api/v1/elections/${electionId}/authorities`)
          .set('Cookie', adminCookie);
        expect(list.body).toHaveLength(5);
      } finally {
        await prisma.platformUser.deleteMany({ where: { email: { in: extraEmails } } });
      }
    });
  });

  describe('Auditoria de padron y checkpoints (HU-02/HU-04 AC-07)', () => {
    it('registra updatedBy del Admin que modifica la configuracion', async () => {
      const admin2Email = `e2e-elections-admin2-${suffix}@themis.dev`;
      const admin2 = await prisma.platformUser.create({
        data: {
          email: admin2Email,
          passwordHash: await hashPassword('clave-e2e'),
          nombreCompleto: 'Admin2 E2E Elections',
          role: 'ADMIN',
        },
      });

      try {
        const created = await request(app.getHttpServer())
          .post('/api/v1/elections')
          .set('Cookie', adminCookie)
          .send(baseElectionPayload({ nombre: `Auditoria ${suffix}` }));
        const auditElectionId = created.body.id as string;
        const login = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: admin2Email, password: 'clave-e2e' });
        const admin2Cookie = extractCookie(
          login.headers['set-cookie'] as unknown as string[] | undefined,
        );

        await request(app.getHttpServer())
          .put(`/api/v1/elections/${auditElectionId}/roll-config`)
          .set('Cookie', admin2Cookie)
          .send({
            profundidadArbol: 12,
            elegibilidadFacultad: 'FICCT',
            elegibilidadCarreras: [],
            elegibilidadTipoUsuario: 'ESTUDIANTE',
            elegibilidadEstadoAcademico: 'ACTIVO',
          })
          .expect(200);
        const afterRoll = await request(app.getHttpServer())
          .get(`/api/v1/elections/${auditElectionId}`)
          .set('Cookie', adminCookie);
        expect(afterRoll.body.updatedBy).toBe(admin2.id);

        const admin1 = await prisma.platformUser.findUnique({ where: { email: adminEmail } });
        await request(app.getHttpServer())
          .put(`/api/v1/elections/${auditElectionId}/checkpoint-policy`)
          .set('Cookie', adminCookie)
          .send({ checkpointIntervalMinutes: 30, rateLimitThresholdPerMinute: 100 })
          .expect(200);
        const afterPolicy = await request(app.getHttpServer())
          .get(`/api/v1/elections/${auditElectionId}`)
          .set('Cookie', adminCookie);
        expect(afterPolicy.body.updatedBy).toBe(admin1!.id);
      } finally {
        await prisma.platformUser.deleteMany({ where: { email: admin2Email } });
      }
    });
  });

  describe('Busqueda de cuentas por email para designacion (addendum UT-CORE-HU03-07)', () => {
    it('ADMIN puede buscar cuentas AUTORIDAD_REGISTRO por email', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/users')
        .query({ email: `e2e-elections-autoridad-${suffix}`, role: 'AUTORIDAD_REGISTRO' })
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.every((u: { role: string }) => u.role === 'AUTORIDAD_REGISTRO'),
      ).toBe(true);
    });

    it('un AUTORIDAD_REGISTRO/AUDITOR sigue sin poder listar cuentas', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/users')
        .set('Cookie', auditorCookie);
      expect(response.status).toBe(403);
    });
  });

  describe('Politica de checkpoints y limite de tasa (HU-04)', () => {
    it('devuelve el valor por defecto de sistema antes de configurar (AC-05)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/elections/${electionId}/checkpoint-policy`)
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        checkpointIntervalMinutes: 60,
        rateLimitThresholdPerMinute: 50,
        esValorPorDefecto: true,
      });
    });

    it('configura intervalo y umbral (AC-01, AC-02)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/elections/${electionId}/checkpoint-policy`)
        .set('Cookie', adminCookie)
        .send({ checkpointIntervalMinutes: 30, rateLimitThresholdPerMinute: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        checkpointIntervalMinutes: 30,
        rateLimitThresholdPerMinute: 100,
        esValorPorDefecto: false,
      });
    });

    it('400 con intervalo fuera de rango', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/elections/${electionId}/checkpoint-policy`)
        .set('Cookie', adminCookie)
        .send({ checkpointIntervalMinutes: 1, rateLimitThresholdPerMinute: 50 });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('CHECKPOINT_INTERVAL_OUT_OF_RANGE');
    });
  });

  describe('Eliminacion de elecciones en BORRADOR (HU-01, AC-05)', () => {
    it('elimina la eleccion creada al final de la suite', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/elections')
        .set('Cookie', adminCookie)
        .send(baseElectionPayload({ nombre: `Representante FICCT a borrar ${suffix}` }));

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/elections/${created.body.id}`)
        .set('Cookie', adminCookie);

      expect(response.status).toBe(204);
    });
  });
});
