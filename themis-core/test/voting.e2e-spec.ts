import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { hashPassword } from '../src/modules/mock-sso/infrastructure/hash.util';
import { DomainErrorFilter } from '../src/shared/errors/domain-error.filter';

/**
 * Cubre el contrato de los endpoints del votante que NO necesitan blockchain.
 * La emision de voto en si (que exige un nodo con el contrato Semaphore
 * desplegado y una prueba zk-SNARK real) se verifica con
 * `scripts/manual-test-full-flow.ts`.
 */
describe('voting (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const codigoInstitucional = `E2E-VOT-${Date.now()}`;
  let electionId: string;

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new DomainErrorFilter());
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.mockSsoUser.create({
      data: {
        codigoInstitucional,
        passwordHash: hashPassword('clave-e2e'),
        nombreCompleto: 'Votante E2E Voto',
        facultad: 'FICCT',
        carrera: 'INGENIERIA_SISTEMAS',
        tipoUsuario: 'ESTUDIANTE',
        estadoAcademico: 'ACTIVO',
      },
    });

    const election = await prisma.election.create({
      data: {
        nombre: `Eleccion E2E Voto ${Date.now()}`,
        registroInicio: new Date('2020-01-01T00:00:00Z'),
        registroFin: new Date('2020-01-02T00:00:00Z'),
        votacionInicio: new Date('2020-01-03T00:00:00Z'),
        votacionFin: new Date('2099-01-01T00:00:00Z'),
        estado: 'VOTACION_ABIERTA',
        createdBy: 'e2e-seed',
        updatedBy: 'e2e-seed',
        opciones: {
          create: [
            { nombre: 'Opcion A', onChainIndex: 0 },
            { nombre: 'Opcion B', onChainIndex: 1 },
          ],
        },
      },
    });
    electionId = election.id;
  });

  afterAll(async () => {
    await prisma.voteReceipt.deleteMany({ where: { electionId } });
    await prisma.voteSubmission.deleteMany({ where: { electionId } });
    await prisma.option.deleteMany({ where: { electionId } });
    await prisma.election.delete({ where: { id: electionId } });
    await prisma.mockSsoUser.deleteMany({ where: { codigoInstitucional } });
    await app.close();
  });

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/mock-sso/login')
      .send({ codigoInstitucional, password: 'clave-e2e' });
    return response.body.assertion as string;
  }

  describe('POST /elections/:id/voter-status', () => {
    // Informar hasVoted exigia guardar quien voto y cuando, y esa marca de
    // tiempo permitia cruzar al votante con su opcion. El cliente sabe si ya
    // voto por el recibo que guarda en el dispositivo.
    it('no expone hasVoted ni votedAt', async () => {
      const assertion = await login();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/voter-status`)
        .send({ assertion });

      expect(response.status).toBe(200);
      expect(Object.keys(response.body).sort()).toEqual(['electionId', 'isRegistered']);
    });

    it('devuelve isRegistered=false con una assertion invalida, sin filtrar nada mas', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/voter-status`)
        .send({ assertion: 'payload-falso.firma-falsa' });

      expect(response.status).toBe(200);
      expect(response.body.isRegistered).toBe(false);
    });
  });

  describe('POST /elections/:id/votes', () => {
    // El ValidationPipe corre con whitelist:true, asi que un cliente viejo que
    // siga mandando la assertion no la puede reintroducir: se descarta antes
    // de llegar al caso de uso, que ya no la acepta.
    it('descarta la assertion si un cliente todavia la envia', async () => {
      const assertion = await login();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/votes`)
        .send({
          assertion,
          optionId: 'inexistente',
          proof: {
            merkleTreeDepth: 16,
            merkleTreeRoot: '1',
            nullifier: `nullifier-e2e-${Date.now()}`,
            message: '99',
            scope: '1',
            points: ['1', '2', '3', '4', '5', '6', '7', '8'],
          },
        });

      // 404 OPTION_NOT_FOUND: el message 99 no corresponde a ninguna opcion, y
      // se rechaza antes de tocar la cadena. Lo que importa es que la
      // assertion no cambia el resultado ni queda registrada en ninguna parte.
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('OPTION_NOT_FOUND');

      const receipts = await prisma.voteReceipt.count({ where: { electionId } });
      expect(receipts).toBe(0);
    });
  });
});
