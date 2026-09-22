/**
 * Prueba manual end-to-end de TODO lo implementado del diagrama de secuencia de
 * votacion: FASE 1 (registro, CU-05), checkpoint (CU-06 a CU-09), y FASE 2 (voto,
 * CU-10, conteo en vivo CU-11, y conteo final CU-14).
 *
 * CU-09 (insercion on-chain) y CU-10 (voto) ya son reales: los commitments se
 * insertan en un grupo Semaphore de verdad y el voto se valida con una prueba
 * zk-SNARK real (Semaphore.validateProof) via ThemisSemaphoreRegistry.sol
 * (wrapper del Semaphore oficial v4). La prueba se genera con las mismas
 * librerias que usa /prove de themis-web (@semaphore-protocol/group + proof),
 * agregadas como devDependency solo para este script.
 *
 * Requisitos antes de correr:
 *   - Los 4 procesos: pnpm chain:node / chain:deploy:local / chain:deploy:semaphore:local /
 *     start:dev (con SEMAPHORE_REGISTRY_ADDRESS ya pegado en .env)
 *   - pnpm run seed:platform-users corrido al menos una vez (admin@themis.dev /
 *     superusuario@themis.dev con password 123123)
 *   - Acceso a internet: generateProof descarga los artefactos oficiales del
 *     circuito de snark-artifacts.pse.dev la primera vez que se necesita cada
 *     profundidad de arbol.
 *
 * Uso: pnpm run test:manual-flow
 *
 * Este script habla HTTP con el backend real (no usa supertest ni levanta un
 * TestingModule) -- es el mismo camino que seguirian themis-app/themis-web, y
 * ejercita los crons reales (cierre de checkpoint, y el VotingScheduler que
 * sincroniza votos y calcula el conteo final) esperando a que corran solos.
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
  throw new Error(
    'SEMAPHORE_REGISTRY_ADDRESS no esta seteado -- corre pnpm chain:deploy:semaphore:local ' +
      'y pega la direccion en .env antes de correr este script.',
  );
}

const BASE_URL = 'http://localhost:3000/api/v1';
const RUN_ID = Date.now();

const prisma = new PrismaClient();

function extractCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`Respuesta sin Set-Cookie (status ${response.status})`);
  }
  return setCookie.split(';')[0];
}

async function postJson(
  path: string,
  body: unknown,
  cookie?: string,
): Promise<{ status: number; body: any; cookie?: string }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (response.status >= 400) {
    console.error(`  ! POST ${path} -> ${response.status}`, json);
  }
  return { status: response.status, body: json, cookie: response.headers.get('set-cookie') ?? undefined };
}

async function getJson(path: string, cookie?: string): Promise<{ status: number; body: any }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json };
}

async function putJson(path: string, body: unknown, cookie: string): Promise<{ status: number; body: any }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json };
}

async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) {
    throw new Error(`Login fallo para ${email}: ${response.status}`);
  }
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
  return {
    suite,
    publicKey,
    preparedMsg,
    inv,
    blindedMessage: Buffer.from(blindedMsg).toString('base64'),
  };
}

async function registerVoter(electionId: string, codigoInstitucional: string, commitment: string) {
  const loginResponse = await postJson('/mock-sso/login', { codigoInstitucional, password: '123123' });
  const assertion = loginResponse.body.assertion as string;

  const { suite, publicKey, preparedMsg, inv, blindedMessage } = await blindCommitment(commitment);

  const registerResponse = await postJson(`/elections/${electionId}/registration-requests`, {
    assertion,
    blindedMessage,
  });
  if (registerResponse.status !== 201) {
    throw new Error(`registration-requests fallo para ${codigoInstitucional}`);
  }

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
  if (presentResponse.status !== 201) {
    throw new Error(`credentials/present fallo para ${codigoInstitucional}`);
  }
  console.log(`  - ${codigoInstitucional}: registrado y credencial presentada (commitment=${commitment})`);
}

/** PUT directo (sin guard de rol) para forzar transiciones que el ciclo de vida
 * automatico no haria en la ventana de tiempo de esta prueba (votacionInicio
 * queda deliberadamente lejos en el futuro para no competir con el cron
 * mientras corren las fases anteriores). */
async function forceElectionStatus(electionId: string, estado: string): Promise<void> {
  await prisma.election.update({ where: { id: electionId }, data: { estado: estado as never } });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== FASE 0: setup (SSO de prueba + cuentas de autoridad + eleccion) ===');

  // --- 3 votantes de prueba (mock-sso), habilitados ---
  const voterCodes = [`${RUN_ID}01`, `${RUN_ID}02`, `${RUN_ID}03`].map((c) => c.slice(-9));
  for (const codigo of voterCodes) {
    await prisma.mockSsoUser.upsert({
      where: { codigoInstitucional: codigo },
      update: {},
      create: {
        codigoInstitucional: codigo,
        passwordHash: hashPassword('123123'),
        nombreCompleto: `Votante Flujo ${codigo}`,
        facultad: 'FICCT',
        carrera: 'INGENIERIA_SISTEMAS',
        tipoUsuario: 'ESTUDIANTE',
        estadoAcademico: 'ACTIVO',
      },
    });
  }
  console.log(`3 votantes de prueba listos: ${voterCodes.join(', ')} (password 123123)`);

  // --- 5 cuentas AUTORIDAD_REGISTRO frescas, via SUPERUSUARIO ---
  const superCookie = await login('superusuario@themis.dev', '123123');
  const authorityAccounts: { id: string; email: string }[] = [];
  for (let i = 1; i <= 5; i += 1) {
    const email = `flujo-autoridad-${RUN_ID}-${i}@themis.dev`;
    const created = await postJson(
      '/auth/users',
      { email, password: 'Flujo123!', nombreCompleto: `Autoridad Flujo ${i}`, role: 'AUTORIDAD_REGISTRO' },
      superCookie,
    );
    authorityAccounts.push({ id: created.body.id, email });
  }
  console.log(`5 cuentas AUTORIDAD_REGISTRO creadas (password Flujo123!)`);

  // --- Eleccion, con ventana de registro ya abierta ---
  const adminCookie = await login('admin@themis.dev', '123123');
  const now = new Date();
  const registroInicio = new Date(now.getTime() - 24 * 60 * 60_000);
  const registroFin = new Date(now.getTime() + 24 * 60 * 60_000);
  const votacionInicio = new Date(now.getTime() + 48 * 60 * 60_000);
  const votacionFin = new Date(now.getTime() + 72 * 60 * 60_000);

  const electionResponse = await postJson(
    '/elections',
    {
      nombre: `Flujo completo ${RUN_ID}`,
      registroInicio: registroInicio.toISOString(),
      registroFin: registroFin.toISOString(),
      votacionInicio: votacionInicio.toISOString(),
      votacionFin: votacionFin.toISOString(),
      opciones: [{ nombre: 'Candidato A' }, { nombre: 'Candidato B' }],
    },
    adminCookie,
  );
  const electionId = electionResponse.body.id as string;
  console.log(`Eleccion creada: ${electionId}`);

  // Checkpoint cada 5 min (el minimo permitido) -- hay que configurarlo ANTES de abrir
  // el registro, la politica queda bloqueada una vez REGISTRO_ABIERTO.
  await putJson(
    `/elections/${electionId}/checkpoint-policy`,
    { checkpointIntervalMinutes: 5, rateLimitThresholdPerMinute: 50 },
    adminCookie,
  );
  console.log('Politica de checkpoint configurada: cada 5 minutos');

  await postJson(
    `/elections/${electionId}/authorities`,
    {
      autoridades: authorityAccounts.map((account) => ({
        platformUserId: account.id,
        rolDescriptivo: 'Autoridad de prueba',
      })),
    },
    adminCookie,
  );
  console.log('5 autoridades designadas');

  // profundidadArbol es obligatorio antes de crear el grupo Semaphore on-chain
  // (CU-09, capacidad maxima a nivel aplicacion) -- se configura junto al resto
  // del padron, mientras la eleccion sigue en BORRADOR.
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
  console.log('Padron configurado: profundidadArbol=13');

  // El registro se abre solo: registroInicio ya paso y la eleccion tiene padron y las 5
  // autoridades, asi que el cron de ciclo de vida (cada minuto) la pasa a REGISTRO_ABIERTO.
  console.log('Esperando a que el cron de ciclo de vida abra el registro (hasta ~70s)...');
  let estado = 'BORRADOR';
  for (let attempt = 0; attempt < 14 && estado !== 'REGISTRO_ABIERTO'; attempt += 1) {
    await sleep(5000);
    estado = (await getJson(`/elections/${electionId}`, adminCookie)).body.estado as string;
  }
  if (estado !== 'REGISTRO_ABIERTO') {
    throw new Error(`La eleccion no se abrio sola, estado=${estado}`);
  }
  console.log('Eleccion abierta automaticamente: REGISTRO_ABIERTO\n');

  console.log('=== FASE 1: registro de votantes (CU-05) ===');
  // Se guardan las Identity completas (no solo el commitment): CU-10 las
  // necesita para generar la prueba de voto mas adelante.
  const voterIdentities: Identity[] = [];
  for (let i = 0; i < voterCodes.length; i += 1) {
    const identity = new Identity();
    voterIdentities.push(identity);
    await registerVoter(electionId, voterCodes[i], identity.commitment.toString());
  }

  // Al abrirse, el intervalo del checkpoint empieza a contar. Se retrocede el ultimo
  // cierre para que venza en el siguiente tick del cron en vez de esperar el intervalo.
  await prisma.election.update({
    where: { id: electionId },
    data: { lastCheckpointClosedAt: new Date(Date.now() - 10 * 60_000) },
  });

  console.log('\n=== CHECKPOINT: esperando a que el cron cierre el lote (CU-07, hasta ~70s) ===');
  let batchId: string | null = null;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    await sleep(5000);
    const batches = await getJson(`/elections/${electionId}/batches`, adminCookie);
    if (batches.body.length > 0) {
      batchId = batches.body[0].id;
      console.log(`Lote cerrado por el cron: ${batchId} (${batches.body[0].credentialCount} credenciales)`);
      break;
    }
    console.log(`  ... todavia no cierra (intento ${attempt + 1}/14)`);
  }
  if (!batchId) {
    throw new Error('El cron no cerro ningun lote en el tiempo esperado');
  }

  console.log('\n=== CHECKPOINT: aprobacion multisig 3-de-5 (CU-08) ===');
  for (let i = 0; i < 3; i += 1) {
    const cookie = await login(authorityAccounts[i].email, 'Flujo123!');
    const approveResponse = await postJson(
      `/elections/${electionId}/batches/${batchId}/approvals`,
      {},
      cookie,
    );
    console.log(
      `  Aprobacion ${i + 1}/3 (${authorityAccounts[i].email}) -> status=${approveResponse.body.status}, approvalCount=${approveResponse.body.approvalCount}`,
    );
  }

  console.log('\n=== CHECKPOINT: resultado final (CU-09, insercion on-chain real) ===');
  const detail = await getJson(`/elections/${electionId}/batches/${batchId}`, adminCookie);
  console.log(JSON.stringify(detail.body, null, 2));

  const { onChainTxHash, merkleRootAfter } = detail.body as {
    onChainTxHash?: string;
    merkleRootAfter?: string;
  };
  const looksLikeRealTxHash = !!onChainTxHash && /^0x[0-9a-f]{64}$/i.test(onChainTxHash);
  const looksLikeRealRoot = !!merkleRootAfter && /^\d+$/.test(merkleRootAfter);
  if (!looksLikeRealTxHash || !looksLikeRealRoot) {
    throw new Error(
      `El resultado no parece on-chain real (onChainTxHash=${onChainTxHash}, ` +
        `merkleRootAfter=${merkleRootAfter}) -- revisar SEMAPHORE_ONCHAIN_PORT y ` +
        'SEMAPHORE_REGISTRY_ADDRESS.',
    );
  }
  console.log(
    `OK: onChainTxHash y merkleRootAfter tienen forma real (no 0xstub-.../stub-root-...).`,
  );

  console.log('\n=== FASE 2: abriendo votacion a mano (VOTACION_ABIERTA) ===');
  // votacionInicio quedo deliberadamente 48h en el futuro (ver FASE 0) para que
  // el cron de ciclo de vida no compitiera con las fases anteriores -- se fuerza
  // el estado directo, igual criterio que ya usa este script para
  // lastCheckpointClosedAt mas arriba.
  await forceElectionStatus(electionId, 'VOTACION_ABIERTA');
  console.log('Eleccion forzada a VOTACION_ABIERTA');

  console.log('\n=== FASE 2: emision de voto real (CU-10) ===');
  const votingContext = await getJson(`/elections/${electionId}/voting-context`);
  const { onChainGroupId, members, options } = votingContext.body as {
    onChainGroupId: string;
    members: string[];
    options: { id: string; onChainIndex: number }[];
  };
  console.log(`  voting-context: grupo=${onChainGroupId}, members=${members.length}`);
  if (members.length !== voterIdentities.length) {
    throw new Error(
      `voting-context trajo ${members.length} members, se esperaban ${voterIdentities.length}`,
    );
  }

  // Los 2 primeros votantes eligen la opcion A, el 3ro la B -- para poder
  // verificar el desglose del tally mas abajo, no solo el total.
  const chosenOption = [options[0], options[0], options[1]];
  const group = new Group(members.map((member) => BigInt(member)));

  for (let i = 0; i < voterIdentities.length; i += 1) {
    const identity = voterIdentities[i];
    const option = chosenOption[i];
    const proof = await generateProof(
      identity,
      group,
      BigInt(option.onChainIndex),
      BigInt(onChainGroupId),
    );
    const voteResponse = await postJson(`/elections/${electionId}/votes/relay-submit`, {
      merkleTreeDepth: proof.merkleTreeDepth,
      merkleTreeRoot: proof.merkleTreeRoot,
      nullifier: proof.nullifier,
      message: proof.message,
      scope: proof.scope,
      points: proof.points,
    });
    if (voteResponse.status !== 201) {
      throw new Error(
        `POST /votes/relay-submit fallo para el votante ${i + 1}: ` +
          `${voteResponse.status} ${JSON.stringify(voteResponse.body)}`,
      );
    }
    console.log(
      `  Voto ${i + 1}/${voterIdentities.length} emitido -> onChainTxHash=${voteResponse.body.onChainTxHash}`,
    );
  }

  // Reintentar el mismo nullifier debe rechazarse -- prueba que el contrato
  // (no solo la app) es la fuente de verdad de "un voto por identidad".
  const firstIdentity = voterIdentities[0];
  const duplicateProof = await generateProof(
    firstIdentity,
    group,
    BigInt(chosenOption[0].onChainIndex),
    BigInt(onChainGroupId),
  );
  const duplicateResponse = await postJson(`/elections/${electionId}/votes/relay-submit`, {
    merkleTreeDepth: duplicateProof.merkleTreeDepth,
    merkleTreeRoot: duplicateProof.merkleTreeRoot,
    nullifier: duplicateProof.nullifier,
    message: duplicateProof.message,
    scope: duplicateProof.scope,
    points: duplicateProof.points,
  });
  if (duplicateResponse.status !== 409 || duplicateResponse.body.code !== 'VOTE_ALREADY_CAST') {
    throw new Error(
      `El segundo voto de la misma identidad deberia rechazarse con 409 VOTE_ALREADY_CAST, ` +
        `llego status=${duplicateResponse.status} code=${duplicateResponse.body.code}`,
    );
  }
  console.log('  OK: un segundo voto con la misma identidad se rechaza (409 VOTE_ALREADY_CAST)');

  console.log('\n=== FASE 2: conteo en vivo (CU-11) ===');
  const tally = await getJson(`/elections/${electionId}/votes/tally`);
  console.log(JSON.stringify(tally.body, null, 2));
  if (tally.body.totalVotes !== voterIdentities.length) {
    throw new Error(`Tally esperaba ${voterIdentities.length} votos, trajo ${tally.body.totalVotes}`);
  }
  const optionATally = tally.body.opciones.find((o: { optionId: string }) => o.optionId === options[0].id);
  if (optionATally?.voteCount !== 2) {
    throw new Error(`Se esperaban 2 votos para la opcion A, tally trajo ${optionATally?.voteCount}`);
  }
  console.log('OK: el tally en vivo refleja los 3 votos con el desglose 2/1 esperado.');

  console.log('\n=== FASE 3: cierre y conteo final (CU-14) ===');
  await forceElectionStatus(electionId, 'CERRADA');
  console.log('Eleccion forzada a CERRADA. Esperando al VotingScheduler (hasta ~70s)...');

  let auditResult: any = null;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    await sleep(5000);
    const audit = await getJson(`/elections/${electionId}/audit/result`, adminCookie);
    if (audit.body.result) {
      auditResult = audit.body;
      break;
    }
    console.log(`  ... todavia sin snapshot final (intento ${attempt + 1}/14)`);
  }
  if (!auditResult) {
    throw new Error('El VotingScheduler no genero el snapshot final (ElectionResult) a tiempo');
  }
  console.log(JSON.stringify(auditResult, null, 2));
  if (auditResult.result.totalVotes !== voterIdentities.length) {
    throw new Error(
      `ElectionResult.totalVotes esperaba ${voterIdentities.length}, trajo ${auditResult.result.totalVotes}`,
    );
  }
  console.log('OK: CU-14 calculo el snapshot final inmutable con el total correcto (CU-15 lo expone).');

  console.log('\n=== FASE ANONIMATO: no se puede asociar un voto con su votante ===');
  await verifyAnonymity(electionId, voterCodes, members);

  console.log(
    `\nEleccion de prueba: ${electionId} (no se borra automaticamente, queda en la BD).\n` +
      'Ciclo completo CU-01 a CU-15 (salvo CU-12/CU-13, IA, fuera de alcance) verificado end-to-end.',
  );
  await prisma.$disconnect();
}

/**
 * Comprueba que los canales que permitian asociar un voto con su votante estan
 * cerrados. Cada assert reproduce un ataque concreto que antes funcionaba.
 */
async function verifyAnonymity(
  electionId: string,
  voterCodes: string[],
  members: string[],
): Promise<void> {
  // 1. La identidad ya no se deriva del `sub` del SSO. Antes la app usaba
  //    `new Identity('themis:voter:<sub>')`, y como el backend tiene todos los
  //    `sub` en mock_sso_users podia recalcular el commitment y el nullifier de
  //    cada persona. Esto reproduce ese calculo exacto y exige que ningun
  //    commitment derivado este en el arbol.
  const users = await prisma.mockSsoUser.findMany({
    where: { codigoInstitucional: { in: voterCodes } },
    select: { id: true, codigoInstitucional: true },
  });
  if (users.length !== voterCodes.length) {
    throw new Error('No se encontraron todos los votantes de prueba en mock_sso_users');
  }
  for (const user of users) {
    const derived = new Identity(`themis:voter:${user.id}`).commitment.toString();
    if (members.includes(derived)) {
      throw new Error(
        `El commitment de ${user.codigoInstitucional} es derivable de su sub: ` +
          'la identidad volvio a ser determinista y el voto se puede asociar al votante',
      );
    }
  }
  console.log(`  OK: ningun commitment del arbol es derivable del sub (${users.length} votantes)`);

  // 2. La tabla que guardaba (scoped_token_hash, voted_at) no existe.
  const [{ existe }] = await prisma.$queryRaw<{ existe: boolean }[]>`
    SELECT to_regclass('voter_participations') IS NOT NULL AS existe
  `;
  if (existe) {
    throw new Error('La tabla voter_participations existe: permite cruzar votante y voto por hora');
  }
  console.log('  OK: la tabla voter_participations no existe');

  // 3. No hay ninguna columna por la que unir el registro (que lleva el
  //    scoped_token_hash) con el voto. Detecta cualquier columna nueva que
  //    rompa la regla 2 en el futuro.
  const columnsOf = async (table: string): Promise<string[]> => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
    `;
    return rows.map((row) => row.column_name);
  };
  const registration = await columnsOf('registration_requests');
  for (const table of ['vote_receipts', 'vote_submissions']) {
    const shared = (await columnsOf(table)).filter(
      (column) => registration.includes(column) && column !== 'id' && column !== 'status',
    );
    if (shared.length !== 1 || shared[0] !== 'election_id') {
      throw new Error(
        `${table} comparte columnas con registration_requests ademas de election_id: ` +
          shared.join(', '),
      );
    }
  }
  console.log('  OK: registro y voto no comparten ninguna columna mas que election_id');

  // 4. k-anonimato del lote: con un solo miembro, la hora del registro alcanza
  //    para saber de quien es ese commitment, sin importar lo demas.
  const batches = await prisma.registrationBatch.findMany({
    where: { electionId, status: 'INSERTED' },
    select: { id: true, credentialCount: true },
  });
  const solitarios = batches.filter((batch) => batch.credentialCount < 2);
  if (solitarios.length > 0) {
    console.warn(
      `  AVISO: ${solitarios.length} lote(s) insertados con una sola credencial. ` +
        'Un lote de 1 no da anonimato: subir el intervalo de checkpoint o el delay de presentacion.',
    );
  } else {
    console.log(`  OK: los ${batches.length} lote(s) insertados agrupan 2+ credenciales`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
