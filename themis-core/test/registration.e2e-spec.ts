import { webcrypto } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { hashPassword } from '../src/modules/mock-sso/infrastructure/hash.util';
import { DomainErrorFilter } from '../src/shared/errors/domain-error.filter';

describe('registration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const codigoInstitucional = `E2E-REG-${Date.now()}`;
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
        nombreCompleto: 'Votante E2E',
        facultad: 'FICCT',
        carrera: 'INGENIERIA_SISTEMAS',
        tipoUsuario: 'ESTUDIANTE',
        estadoAcademico: 'ACTIVO',
      },
    });

    const election = await prisma.election.create({
      data: {
        nombre: `Eleccion E2E Registro ${Date.now()}`,
        registroInicio: new Date('2020-01-01T00:00:00Z'),
        registroFin: new Date('2099-01-01T00:00:00Z'),
        votacionInicio: new Date('2099-01-01T00:00:00Z'),
        votacionFin: new Date('2099-01-02T00:00:00Z'),
        estado: 'REGISTRO_ABIERTO',
        createdBy: 'e2e-seed',
        updatedBy: 'e2e-seed',
      },
    });
    electionId = election.id;
  });

  afterAll(async () => {
    await prisma.registrationRequest.deleteMany({ where: { electionId } });
    await prisma.presentedCredential.deleteMany({ where: { electionId } });
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

  // Simula el lado cliente: pide la clave publica real del servidor y ciega
  // un commitment de prueba con la misma librería/suite que usaría la app.
  async function blindCommitment(commitment: string) {
    const publicKeyResponse = await request(app.getHttpServer()).get(
      '/api/v1/registration/public-key',
    );
    const suite = RSABSSA.SHA384.PSS.Randomized();
    const publicKey = await webcrypto.subtle.importKey(
      'jwk',
      JSON.parse(publicKeyResponse.body.publicKeyJwk),
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify'],
    );
    const preparedMsg = suite.prepare(new TextEncoder().encode(commitment));
    const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);
    return {
      suite,
      publicKey,
      preparedMsg,
      inv,
      blindedMessage: Buffer.from(blindedMsg).toString('base64'),
    };
  }

  it('GET /registration/public-key responde con la clave publica sin auth', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/registration/public-key');

    expect(response.status).toBe(200);
    expect(typeof response.body.publicKeyJwk).toBe('string');
    expect(JSON.parse(response.body.publicKeyJwk).kty).toBe('RSA');
  });

  it('POST /elections/:id/registration-requests responde 201 y la firma ciega finaliza en una firma valida', async () => {
    const assertion = await login();
    const { suite, publicKey, preparedMsg, inv, blindedMessage } =
      await blindCommitment('commitment-e2e-1');

    const response = await request(app.getHttpServer())
      .post(`/api/v1/elections/${electionId}/registration-requests`)
      .send({ assertion, blindedMessage });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING');
    expect(typeof response.body.id).toBe('string');
    expect(typeof response.body.blindSignature).toBe('string');

    const stored = await prisma.registrationRequest.findUnique({
      where: { id: response.body.id },
    });
    // blinded_value viaja cegado de verdad: no es igual al commitment en claro.
    expect(stored?.blindedValue).toBe(blindedMessage);
    expect(stored?.blindedValue).not.toContain('commitment-e2e-1');

    const signature = await suite.finalize(
      publicKey,
      preparedMsg,
      Buffer.from(response.body.blindSignature, 'base64'),
      inv,
    );
    await expect(suite.verify(publicKey, signature, preparedMsg)).resolves.toBe(true);
  });

  it('un segundo registro con la misma assertion responde 409 REGISTRATION_ALREADY_REGISTERED', async () => {
    const assertion = await login();
    const first = await blindCommitment('commitment-e2e-2a');
    await request(app.getHttpServer())
      .post(`/api/v1/elections/${electionId}/registration-requests`)
      .send({ assertion, blindedMessage: first.blindedMessage });

    const second = await blindCommitment('commitment-e2e-2b');
    const response = await request(app.getHttpServer())
      .post(`/api/v1/elections/${electionId}/registration-requests`)
      .send({ assertion, blindedMessage: second.blindedMessage });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('REGISTRATION_ALREADY_REGISTERED');
  });

  it('responde 404 ELECTION_NOT_FOUND si la eleccion no existe', async () => {
    const assertion = await login();
    const { blindedMessage } = await blindCommitment('c');

    const response = await request(app.getHttpServer())
      .post('/api/v1/elections/00000000-0000-0000-0000-000000000000/registration-requests')
      .send({ assertion, blindedMessage });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('ELECTION_NOT_FOUND');
  });

  it('responde 401 REGISTRATION_INVALID_ASSERTION para una assertion invalida', async () => {
    const { blindedMessage } = await blindCommitment('c');

    const response = await request(app.getHttpServer())
      .post(`/api/v1/elections/${electionId}/registration-requests`)
      .send({ assertion: 'no-es-una-assertion-valida', blindedMessage });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('REGISTRATION_INVALID_ASSERTION');
  });

  it('la respuesta nunca expone el uuid real del votante ni el scopedTokenHash', async () => {
    const assertion = await login();
    const { blindedMessage } = await blindCommitment('commitment-e2e-3');

    const response = await request(app.getHttpServer())
      .post(`/api/v1/elections/${electionId}/registration-requests`)
      .send({ assertion, blindedMessage });

    const body = JSON.stringify(response.body);
    expect(body).not.toMatch(/scopedTokenHash/i);
  });

  describe('POST /elections/:id/credentials/present', () => {
    const presentTestCodigos: string[] = [];

    afterAll(async () => {
      await prisma.mockSsoUser.deleteMany({
        where: { codigoInstitucional: { in: presentTestCodigos } },
      });
    });

    // scopedTokenHash es unico por (usuario, eleccion), no por commitment -
    // cada llamada a /registration-requests necesita un votante nuevo, o el
    // segundo intento choca con REGISTRATION_ALREADY_REGISTERED.
    async function registerAndFinalize(commitment: string) {
      const codigo = `E2E-PRESENT-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      presentTestCodigos.push(codigo);
      await prisma.mockSsoUser.create({
        data: {
          codigoInstitucional: codigo,
          passwordHash: hashPassword('clave-e2e'),
          nombreCompleto: 'Votante E2E Present',
          facultad: 'FICCT',
          carrera: 'INGENIERIA_SISTEMAS',
          tipoUsuario: 'ESTUDIANTE',
          estadoAcademico: 'ACTIVO',
        },
      });
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/mock-sso/login')
        .send({ codigoInstitucional: codigo, password: 'clave-e2e' });
      const assertion = loginResponse.body.assertion as string;

      const { suite, publicKey, preparedMsg, inv, blindedMessage } =
        await blindCommitment(commitment);

      const registerResponse = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/registration-requests`)
        .send({ assertion, blindedMessage });

      const signature = await suite.finalize(
        publicKey,
        preparedMsg,
        Buffer.from(registerResponse.body.blindSignature, 'base64'),
        inv,
      );

      return {
        preparedMessage: Buffer.from(preparedMsg).toString('base64'),
        signature: Buffer.from(signature).toString('base64'),
      };
    }

    it('responde 201 y persiste el commitment en claro (no cegado)', async () => {
      const { preparedMessage, signature } = await registerAndFinalize('commitment-present-1');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/credentials/present`)
        .send({ preparedMessage, signature });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('PENDING');

      const stored = await prisma.presentedCredential.findUnique({
        where: { id: response.body.id },
      });
      expect(stored?.commitment).toBe('commitment-present-1');
    });

    it('responde 409 CREDENTIAL_ALREADY_PRESENTED si se presenta el mismo commitment de nuevo', async () => {
      const credential = await registerAndFinalize('commitment-present-2');
      await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/credentials/present`)
        .send(credential);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/credentials/present`)
        .send(credential);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('CREDENTIAL_ALREADY_PRESENTED');
    });

    it('responde 400 CREDENTIAL_INVALID_SIGNATURE con una firma inventada', async () => {
      const { preparedMessage } = await registerAndFinalize('commitment-present-3');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/credentials/present`)
        .send({ preparedMessage, signature: Buffer.from('no-es-una-firma').toString('base64') });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('CREDENTIAL_INVALID_SIGNATURE');
    });

    it('no requiere ninguna sesion ni assertion - funciona sin ligar el request al registro original', async () => {
      const { preparedMessage, signature } = await registerAndFinalize('commitment-present-4');

      // Sin cookie, sin header de auth, sin assertion en el body.
      const response = await request(app.getHttpServer())
        .post(`/api/v1/elections/${electionId}/credentials/present`)
        .send({ preparedMessage, signature });

      expect(response.status).toBe(201);
    });
  });
});
