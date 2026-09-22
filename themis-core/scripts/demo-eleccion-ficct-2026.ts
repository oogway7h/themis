/**
 * Demo en tiempo real (no acelerada) de "Elecciones FICCT 2026": crea la
 * eleccion con ventanas cortas (registro 10 min, checkpoint cada 5 min,
 * votacion 10 min) y deja que el ciclo de vida automatico (cron cada minuto)
 * y el cron de checkpoints corran solos, para poder observarlo en vivo en
 * themis-web (/votaciones, /votaciones/:id, y el panel de aprobacion de
 * lotes) mientras corre.
 *
 * A diferencia de scripts/manual-test-full-flow.ts, ACA NO SE FUERZA NINGUN
 * estado ni se adelanta lastCheckpointClosedAt -- todo pasa en tiempo real.
 * Lo unico que este script automatiza (para no depender de que alguien este
 * mirando la pantalla en el momento exacto) es: registrar a los votantes en
 * cuanto abre el registro, aprobar cada lote 3-de-5 en cuanto aparece
 * PENDING_APPROVAL, y emitir los votos en cuanto abre la votacion.
 *
 * Requisitos: los mismos 4 procesos que manual-test-full-flow.ts (chain node,
 * contratos deployados, backend corriendo, seed:platform-users corrido).
 *
 * Uso: pnpm exec ts-node scripts/demo-eleccion-ficct-2026.ts
 */
import { config as loadEnv } from 'dotenv';
import { webcrypto } from 'node:crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { PrismaClient } from '@prisma/client';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';
import { hashPassword } from '../src/modules/mock-sso/infrastructure/hash.util';

loadEnv();

if (!process.env.SEMAPHORE_REGISTRY_ADDRESS) {
  throw new Error('SEMAPHORE_REGISTRY_ADDRESS no esta seteado en .env.');
}

const BASE_URL = 'http://localhost:3000/api/v1';
const RUN_ID = Date.now();
const REGISTRO_MINUTOS = 10;
const VOTACION_MINUTOS = 10;
const CHECKPOINT_INTERVALO_MINUTOS = 5;

const prisma = new PrismaClient();

function ts(): string {
  return new Date().toLocaleTimeString('es-BO');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) throw new Error(`Respuesta sin Set-Cookie (status ${response.status})`);
  return setCookie.split(';')[0];
}

// El backend corre con hot-reload (nest start --watch): un restart de unos
// segundos en medio de esta corrida de ~20 min no deberia tirar todo el
// script. Reintenta solo fallos de red (ECONNREFUSED mientras reinicia), no
// respuestas HTTP de error de la aplicacion.
async function resilientFetch(url: string, init: RequestInit, retries = 6): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`[${ts()}]   ! fetch fallo (${(error as Error).message}), reintentando en 3s...`);
      await sleep(3_000);
    }
  }
  throw new Error('unreachable');
}

async function postJson(path: string, body: unknown, cookie?: string) {
  const response = await resilientFetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (response.status >= 400) console.error(`  ! POST ${path} -> ${response.status}`, json);
  return { status: response.status, body: json as any };
}

async function getJson(path: string, cookie?: string) {
  const response = await resilientFetch(`${BASE_URL}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json as any };
}

async function putJson(path: string, body: unknown, cookie: string) {
  const response = await resilientFetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json as any };
}

async function login(email: string, password: string): Promise<string> {
  const response = await resilientFetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) throw new Error(`Login fallo para ${email}: ${response.status}`);
  return extractCookie(response);
}

async function blindCommitment(commitment: string) {
  const publicKeyResponse = await getJson('/registration/public-key');
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
  return { suite, publicKey, preparedMsg, inv, blindedMessage: Buffer.from(blindedMsg).toString('base64') };
}

async function registerVoter(electionId: string, codigoInstitucional: string, commitment: string) {
  const loginResponse = await postJson('/mock-sso/login', { codigoInstitucional, password: '123123' });
  const assertion = loginResponse.body.assertion as string;
  const { suite, publicKey, preparedMsg, inv, blindedMessage } = await blindCommitment(commitment);

  const registerResponse = await postJson(`/elections/${electionId}/registration-requests`, {
    assertion,
    blindedMessage,
  });
  if (registerResponse.status !== 201) throw new Error(`registration-requests fallo para ${codigoInstitucional}`);

  const signature = await suite.finalize(
    publicKey,
    preparedMsg,
    Buffer.from(registerResponse.body.blindSignature, 'base64'),
    inv,
  );
  const presentResponse = await postJson(`/elections/${electionId}/credentials/present`, {
    preparedMessage: Buffer.from(preparedMsg).toString('base64'),
    signature: Buffer.from(signature).toString('base64'),
  });
  if (presentResponse.status !== 201) throw new Error(`credentials/present fallo para ${codigoInstitucional}`);
  console.log(`[${ts()}]   - ${codigoInstitucional}: registrado y credencial presentada`);
}

async function main() {
  console.log(`[${ts()}] === Elecciones FICCT 2026 -- demo en tiempo real ===`);

  const voterCodes = Array.from({ length: 6 }, (_, i) => `${RUN_ID}${i}`.slice(-9));
  for (const codigo of voterCodes) {
    await prisma.mockSsoUser.upsert({
      where: { codigoInstitucional: codigo },
      update: {},
      create: {
        codigoInstitucional: codigo,
        passwordHash: hashPassword('123123'),
        nombreCompleto: `Votante Demo ${codigo}`,
        facultad: 'FICCT',
        carrera: 'INGENIERIA_SISTEMAS',
        tipoUsuario: 'ESTUDIANTE',
        estadoAcademico: 'ACTIVO',
      },
    });
  }
  console.log(`[${ts()}] ${voterCodes.length} votantes de prueba listos`);

  const superCookie = await login('superusuario@themis.dev', '123123');
  const authorityAccounts: { id: string; email: string }[] = [];
  for (let i = 1; i <= 5; i += 1) {
    const email = `demo-autoridad-${RUN_ID}-${i}@themis.dev`;
    const created = await postJson(
      '/auth/users',
      { email, password: 'Demo123!', nombreCompleto: `Autoridad Demo ${i}`, role: 'AUTORIDAD_REGISTRO' },
      superCookie,
    );
    authorityAccounts.push({ id: created.body.id, email });
  }
  console.log(`[${ts()}] 5 cuentas AUTORIDAD_REGISTRO creadas`);

  const adminCookie = await login('admin@themis.dev', '123123');
  const now = new Date();
  const registroInicio = new Date(now.getTime() - 30_000);
  const registroFin = new Date(now.getTime() + REGISTRO_MINUTOS * 60_000);
  const votacionInicio = registroFin;
  const votacionFin = new Date(votacionInicio.getTime() + VOTACION_MINUTOS * 60_000);

  const electionResponse = await postJson(
    '/elections',
    {
      nombre: 'Elecciones FICCT 2026',
      registroInicio: registroInicio.toISOString(),
      registroFin: registroFin.toISOString(),
      votacionInicio: votacionInicio.toISOString(),
      votacionFin: votacionFin.toISOString(),
      opciones: [{ nombre: 'Ana Martínez' }, { nombre: 'Diego Salazar' }, { nombre: 'Valeria Rojas' }],
    },
    adminCookie,
  );
  const electionId = electionResponse.body.id as string;
  console.log(`[${ts()}] Elección creada: ${electionId}`);
  console.log(`[${ts()}]   registro:  ${registroInicio.toLocaleTimeString('es-BO')} -> ${registroFin.toLocaleTimeString('es-BO')}`);
  console.log(`[${ts()}]   votacion:  ${votacionInicio.toLocaleTimeString('es-BO')} -> ${votacionFin.toLocaleTimeString('es-BO')}`);

  await putJson(
    `/elections/${electionId}/checkpoint-policy`,
    { checkpointIntervalMinutes: CHECKPOINT_INTERVALO_MINUTOS, rateLimitThresholdPerMinute: 50 },
    adminCookie,
  );
  console.log(`[${ts()}] Política de checkpoint: cada ${CHECKPOINT_INTERVALO_MINUTOS} min`);

  await postJson(
    `/elections/${electionId}/authorities`,
    { autoridades: authorityAccounts.map((a) => ({ platformUserId: a.id, rolDescriptivo: 'Autoridad demo' })) },
    adminCookie,
  );

  await putJson(
    `/elections/${electionId}/roll-config`,
    {
      profundidadArbol: 13,
      elegibilidadFacultad: 'FICCT',
      elegibilidadCarreras: [],
      elegibilidadTipoUsuario: 'ESTUDIANTE',
      elegibilidadEstadoAcademico: 'ACTIVO',
    },
    adminCookie,
  );
  console.log(`[${ts()}] Padrón y autoridades configurados. Esperando a que el cron abra el registro...`);

  const voterIdentities: Identity[] = [];
  let votersRegistered = false;
  let votesSubmitted = false;
  const approvedBatches = new Set<string>();
  let lastLoggedStatus = '';
  let auditResult: any = null;
  const deadline = Date.now() + 30 * 60_000; // corte de seguridad

  while (!auditResult && Date.now() < deadline) {
    await sleep(8_000);
    const { body: election } = await getJson(`/elections/${electionId}`, adminCookie);
    const estado = election.estado as string;
    if (estado !== lastLoggedStatus) {
      console.log(`[${ts()}] estado -> ${estado}`);
      lastLoggedStatus = estado;
    }

    if (estado === 'REGISTRO_ABIERTO' && !votersRegistered) {
      console.log(`[${ts()}] === Registro de votantes (CU-05) ===`);
      for (const codigo of voterCodes) {
        const identity = new Identity();
        voterIdentities.push(identity);
        await registerVoter(electionId, codigo, identity.commitment.toString());
      }
      votersRegistered = true;
    }

    const { body: batches } = await getJson(`/elections/${electionId}/batches`, adminCookie);
    for (const batch of batches as any[]) {
      if (batch.status === 'PENDING_APPROVAL' && !approvedBatches.has(batch.id)) {
        console.log(`[${ts()}] === Aprobando lote ${batch.id} (${batch.credentialCount} credenciales) ===`);
        for (let i = 0; i < 3; i += 1) {
          const cookie = await login(authorityAccounts[i].email, 'Demo123!');
          const approval = await postJson(`/elections/${electionId}/batches/${batch.id}/approvals`, {}, cookie);
          console.log(`[${ts()}]   aprobación ${i + 1}/3 -> ${approval.body.status ?? approval.status}`);
        }
        approvedBatches.add(batch.id);
      }
    }

    if (estado === 'VOTACION_ABIERTA' && !votesSubmitted && voterIdentities.length > 0) {
      console.log(`[${ts()}] === Emisión de votos (CU-10) ===`);
      const { body: votingContext } = await getJson(`/elections/${electionId}/voting-context`);
      const { onChainGroupId, members, options } = votingContext as {
        onChainGroupId: string;
        members: string[];
        options: { id: string; onChainIndex: number }[];
      };
      const group = new Group(members.map((m) => BigInt(m)));
      // 3 votos Ana Martínez, 2 Diego Salazar, 1 Valeria Rojas.
      const chosenOption = [options[0], options[0], options[0], options[1], options[1], options[2]];
      for (let i = 0; i < voterIdentities.length; i += 1) {
        const proof = await generateProof(
          voterIdentities[i],
          group,
          BigInt(chosenOption[i].onChainIndex),
          BigInt(onChainGroupId),
        );
        const voteResponse = await postJson(`/elections/${electionId}/votes`, {
          merkleTreeDepth: proof.merkleTreeDepth,
          merkleTreeRoot: proof.merkleTreeRoot,
          nullifier: proof.nullifier,
          message: proof.message,
          scope: proof.scope,
          points: proof.points,
        });
        console.log(
          `[${ts()}]   voto ${i + 1}/${voterIdentities.length} (${chosenOption[i].id}) -> ${voteResponse.status === 201 ? 'OK' : voteResponse.status}`,
        );
      }
      votesSubmitted = true;

      const { body: tally } = await getJson(`/elections/${electionId}/votes/tally`);
      console.log(`[${ts()}] Tally en vivo: ${JSON.stringify(tally)}`);
    }

    if (estado === 'CERRADA') {
      const audit = await getJson(`/elections/${electionId}/audit/result`, adminCookie);
      if (audit.body.result) auditResult = audit.body;
    }
  }

  if (!auditResult) {
    console.log(`[${ts()}] Corte de seguridad (30 min) sin snapshot final. Election ID: ${electionId}`);
  } else {
    console.log(`[${ts()}] === Cierre y conteo final (CU-14/CU-15) ===`);
    console.log(JSON.stringify(auditResult, null, 2));
    console.log(`[${ts()}] Listo. Election ID: ${electionId}`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
