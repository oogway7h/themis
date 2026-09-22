# Checkpoint — inserción por lote con multisig (CU-06 a CU-09)

> Estado: **completo de punta a punta hasta la aprobación del lote.** Backend verificado contra una
> base Postgres y una cadena Hardhat reales (no solo mocks), con inserción **real** en un grupo Semaphore
> v4 on-chain, y pantalla de aprobación en `themis-web` (`features/batch-approval/`). Lo que sigue
> pendiente es la Fase 2 (voto), ver "Pendiente para la Fase 2" al final. Diagrama de secuencia: bloque
> "Checkpoint — inserción por lote con multisig"; diseño de datos de referencia:
> [`modelo-bd-registro.md`](./modelo-bd-registro.md). Índice de toda la documentación: [`README.md`](./README.md).

## Cómo verlo funcionando desde una interfaz

1. **Registro (CU-05)**: solo desde `themis-app` (regla de diseño, no un olvido: `themis-web` nunca es
   una vía de registro ni de voto).
2. **Aprobación (CU-08)**: en `themis-web`, como `AUTORIDAD_REGISTRO`: menú "Mis elecciones" → lotes →
   detalle → **Aprobar lote**. El `ADMIN` ve los lotes en solo lectura desde el detalle de la elección
   ("Ver lotes"). El `AUDITOR` puede leer lotes por API pero hoy no tiene forma de listar elecciones
   (`GET /elections` es solo ADMIN), así que no tiene pantalla.
3. Para ejercitar el backend sin la app móvil: `pnpm run test:manual-flow` (ver más abajo).

## Qué cubre

| CU | Descripción | Estado |
|---|---|---|
| CU-06 | Monitorear ritmo de registro (alertas) | Implementado (backend; sin pantalla, el endpoint `rate-alerts` existe) |
| CU-07 | Cerrar checkpoint y proponer lote | Implementado (cron automático) |
| CU-08 | Aprobar lote de registros (multisig 3-de-5) | Implementado (backend + pantalla en `themis-web`) |
| CU-09 | Insertar lote en el árbol de Merkle on-chain | Implementado, **real** (Semaphore v4, `ThemisSemaphoreRegistry.sol`) |

## Qué se implementó

### Modelo de datos (`prisma/schema.prisma`)

Tres modelos nuevos:

- **`RegistrationBatch`** (`registration_batches`): un lote cerrado por el cron, con
  `status: PENDING_APPROVAL | APPROVED | INSERTED | INSERTION_FAILED`, `approvalsRequired`
  (congela `MULTISIG_THRESHOLD` al cerrar), y los campos de resultado on-chain
  (`merkleRootAfter`, `onChainTxHash`, `onChainGroupId`). `failureReason` se limpia cuando un
  reintento logra insertar.
- **`BatchApproval`** (`batch_approvals`): una fila = una aprobación de una autoridad. El multisig
  3-de-5 se implementa **contando filas** (`@@unique([batchId, authorityId])`), no con una columna
  "aprobado". **No son firmas criptográficas**: el contrato on-chain no verifica ningún multisig; el
  backend cuenta las aprobaciones y luego envía `addMembers` con la wallet relayer. `authorityId`
  referencia el *asiento* (`Authority.id`), no la cuenta, para que "la misma autoridad no aprueba dos
  veces" siga siendo correcto aunque se reemplace la cuenta de un asiento a mitad de ciclo.
- **`RateAlert`** (`rate_alerts`): historial de "esto se registró más rápido de lo normal" (CU-06),
  puramente informativo.

Más columnas nuevas en `Election` (`lastCheckpointClosedAt`, `onChainGroupId`,
`onChainGroupCreatedAt`, `merkleRoot`) y en `PresentedCredential` (`batchId`). El lote se arma
siempre sobre `PresentedCredential.commitment` (el commitment real, ya anónimo) — nunca sobre
`RegistrationRequest`, que solo tiene el valor cegado y no tiene forma de vincularse con el
commitment real sin romper el anonimato del votante.

### Módulo `src/modules/checkpoints/`

Mismas 4 capas (domain/application/infrastructure/presentation) que el resto del backend:

- **`CloseCheckpointUseCase` / `CloseDueCheckpointsUseCase`** (CU-07): cierre automático vía cron
  (`@nestjs/schedule`, tick `EVERY_MINUTE`, más fino que el `checkpointIntervalMinutes` mínimo de 5 min).
  Evita doble cierre por carrera con un compare-and-swap sobre `Election.lastCheckpointClosedAt`
  (`ElectionRepository.tryClaimCheckpoint`). Corre mientras la elección está en `REGISTRO_ABIERTO` y,
  una sola vez (checkpoint final vencido desde `registroFin`), en `REGISTRO_CERRADO`. Al abrirse el
  registro se cierra un primer checkpoint vacío que ancla el intervalo: el primer lote real llega
  `checkpointIntervalMinutes` después de la apertura.
- **`ApproveBatchUseCase`** (CU-08): una autoridad aprueba un lote. Verifica que la cuenta esté
  designada como autoridad *de esa elección específica* (el `RolesGuard` solo prueba el rol, no el
  alcance por elección). La aprobación que cruza `approvalsRequired` (la 3ra, hoy) dispara la inserción
  on-chain **en el mismo request**, protegida con otro CAS para que se dispare una sola vez aunque dos
  aprobaciones lleguen casi simultáneas.
- **`RetryPendingInsertionsUseCase`**: red de seguridad (cron cada 5 min) para lotes que quedaron
  `APPROVED`/`INSERTION_FAILED`. El disparador primario sigue siendo `ApproveBatchUseCase`, síncrono.
- **`CheckRegistrationRateUseCase`** (CU-06): por elección con registro abierto, cuenta credenciales
  presentadas en el último minuto contra `rateLimitThresholdEfectivo`; crea `RateAlert` con cooldown de
  10 min. No bloquea ningún flujo de registro.
- **`SemaphoreOnChainPort`** (`domain/semaphore-onchain.port.ts`) y su implementación real
  **`SemaphoreOnChainService`** (`infrastructure/`): un grupo Semaphore por elección, creado
  perezosamente en la primera inserción (la wallet relayer es su admin), luego `addMembers` y lectura de
  la nueva raíz. Es seguro reintentar: si todos los commitments ya son miembros no reenvía la
  transacción; si solo algunos lo son (inserción parcial) falla con un mensaje pidiendo revisión manual.
  `profundidadArbol` **no** se pasa al contrato: Semaphore v4 usa un árbol de profundidad dinámica, así
  que es solo un tope de capacidad de aplicación. Los grupos nuevos se crean con
  `merkleTreeDuration = 3600 s` (1 hora): las raíces anteriores siguen siendo válidas ese tiempo para
  verificar pruebas (los grupos creados antes de este cambio conservan 0). `StubSemaphoreOnChainService`
  sigue en el repo, sin uso.
- **`ListBatchesUseCase` / `GetBatchDetailUseCase` / `ListRateAlertsUseCase` /
  `ListMyAuthorityElectionsUseCase`**: lecturas para los endpoints REST y para la pantalla web.

### Contrato y despliegue

`contracts/ThemisSemaphoreRegistry.sol` es un wrapper delgado sobre el `Semaphore.sol` oficial
(`@semaphore-protocol/contracts` 4.x), sin cambios de comportamiento. `scripts/deploy-semaphore.ts`
despliega verificador + Poseidon + registro; su dirección va en `SEMAPHORE_REGISTRY_ADDRESS`. Ver
"Cómo probarlo manualmente" para el orden de los deploys.

### Endpoints (`CheckpointsController`)

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/elections/mine/authority` | `AUTORIDAD_REGISTRO` (descubre en qué elecciones está designada la cuenta) |
| `GET` | `/elections/:electionId/batches` | `ADMIN`, `AUTORIDAD_REGISTRO`, `AUDITOR` |
| `GET` | `/elections/:electionId/batches/:batchId` | `ADMIN`, `AUTORIDAD_REGISTRO`, `AUDITOR` |
| `POST` | `/elections/:electionId/batches/:batchId/approvals` | `AUTORIDAD_REGISTRO` |
| `GET` | `/elections/:electionId/rate-alerts` | `ADMIN`, `AUDITOR` |

Los errores de dominio llegan como `{ code, message }`. Los de aprobar: `BATCH_NOT_FOUND` (404),
`AUTHORITY_NOT_DESIGNATED_FOR_ELECTION` (403), `BATCH_ALREADY_APPROVED_BY_AUTHORITY` (409),
`BATCH_NOT_PENDING_APPROVAL` (409).

`GET /elections/mine/authority` existe porque `GET /elections/:id/authorities` es `ADMIN`-only: sin él
ninguna autoridad podría descubrir en qué elecciones fue designada.

### Tests

Specs en `src/modules/checkpoints/application/*.spec.ts` y `src/modules/elections/application/`
(ciclo de vida automático), con dobles in-memory en `test/doubles/`. `pnpm test` corre en verde con
Node ≥ 24 (Jest 30 necesita Node ≥ 24.9 para cargar `@nestjs/common`, que es ESM-only; con Node 22 falla
en todo el repo, no solo en lo nuevo). Además de los specs, el smoke test manual contra la base y la
cadena reales (abajo).

## Cómo probarlo manualmente

Guía completa, incluida la prueba con la app móvil y el portal: [`guia-prueba-end-to-end.md`](./guia-prueba-end-to-end.md). Versión corta con el script automático:

```bash
# terminales separadas: nodo, deploys (en este orden), backend
pnpm chain:node
pnpm chain:deploy:local
pnpm chain:deploy:semaphore:local   # pega SEMAPHORE_REGISTRY_ADDRESS en .env
pnpm start:dev
```

Con Postgres arriba (`docker compose up -d db`), las migraciones aplicadas (`pnpm prisma:deploy`) y
`pnpm run seed:platform-users` corrido al menos una vez, otra terminal:

```bash
pnpm run test:manual-flow
```

`scripts/manual-test-full-flow.ts` ejercita **todo lo implementado** hablando HTTP real con el backend
(el mismo camino que seguiría `themis-app`/`themis-web`): crea 3 votantes de prueba en
`mock_sso_users`, 5 cuentas `AUTORIDAD_REGISTRO`, una elección con el padrón y las autoridades
configurados, **espera a que el cron de ciclo de vida la abra sola**, corre el protocolo RFC 9474
completo de firma ciega con identidades Semaphore reales para registrar y presentar las 3 credenciales,
espera a que el cron cierre el checkpoint, aprueba el lote con 3 de las 5 autoridades y comprueba que
`onChainTxHash` y `merkleRootAfter` tengan forma real (no `0xstub-…`). Al final imprime que FASE 2 (CU-10)
no tiene ningún endpoint todavía. No borra los datos que crea: quedan en la base para inspeccionar con
`pnpm prisma:studio`.

## Fase 2 (voto CU-10, conteo en vivo CU-11, conteo final CU-14, auditoría CU-15): RESUELTA

Implementada completa y verificada end-to-end contra el stack local real (Hardhat + Neon), incluida
criptografía real (no mockeada) — ver `scripts/manual-test-full-flow.ts` (corre las 3 fases: registro,
checkpoint, y ahora también voto/conteo/cierre). Decisiones que quedaban abiertas, ya tomadas:

- **`scope` de Semaphore = `election.onChainGroupId`** (columna ya existente, única por elección — evita
  que un mismo votante produzca el mismo nullifier en dos elecciones distintas).
- **`message` de Semaphore = `Option.onChainIndex`** (columna nueva, 0..N-1 en orden de creación —
  `Option.id` es un UUID y no sirve como `uint256`).
- **Control de ventana de voto**: `SubmitVoteUseCase` rechaza con 409 `VOTING_WINDOW_CLOSED` si
  `election.estado !== 'VOTACION_ABIERTA'` antes de relayar — el contrato en sí sigue sin mirar fechas.
- **La app ya tiene de dónde sacar la prueba de Merkle**: `GET /elections/:id/voting-context` (público)
  expone `onChainGroupId` + `members` (commitments en orden real de inserción on-chain, reconstruidos
  desde `RegistrationBatch.onChainMemberCommitments`, no desde `PresentedCredential`) + el mapeo de
  opciones a `onChainIndex`. `GET /elections/public` y `GET /elections/public/:id` (ambos públicos)
  resuelven el resto ("no hay endpoint público de elección").
- **Relayer**: se reusó el patrón existente (`BlockchainService.getWallet()`, `RELAYER_PRIVATE_KEY`) — no
  hizo falta una tabla `RELAYERS`. Tablas nuevas: `vote_submissions`, `chain_sync_state`,
  `election_results` + `election_result_options` (snapshot inmutable de CU-14).
- **Sincronizador de eventos `ProofValidated`**: `SyncVoteEventsUseCase` (red de seguridad, cron cada
  minuto vía `VotingScheduler`, mismo espíritu que `RetryPendingInsertionsUseCase` de CU-09).
- **`themis-web`**: ruta `/prove` (pública pero no linkeada, mismo precedente que `/demo`) con
  `snarkjs`/`@semaphore-protocol/{group,identity,proof}` reales — los artefactos del circuito se
  descargan del CDN oficial (`snark-artifacts.pse.dev`), no se vendorizan. **`themis-app`**:
  `VoteProofBridge` (WebView remoto contra `/prove`, mismo patrón que `CryptoBridge` de CU-05) +
  pantallas `ElectionSelectPage`/`BallotPage`.
- **Multisig criptográfico on-chain**: sigue siendo la misma decisión de diseño documentada (el contrato
  confía en el backend, 3 filas en BD) — no cambió con esta fase.
- **Commitments tardíos**: sigue siendo el mismo comportamiento ya documentado (`merkleTreeDuration` de
  1 hora da margen); no se agregó ningún guardrail nuevo — bloquear inserciones tardías rompería el caso
  legítimo de presentarse tarde y aun así poder votar.

## Archivos clave

- `themis-core/prisma/schema.prisma`
- `themis-core/contracts/ThemisSemaphoreRegistry.sol`
- `themis-core/scripts/deploy-semaphore.ts`
- `themis-core/src/modules/checkpoints/checkpoints.module.ts`
- `themis-core/src/modules/checkpoints/application/approve-batch.usecase.ts`
- `themis-core/src/modules/checkpoints/infrastructure/semaphore-onchain.service.ts`
- `themis-core/src/modules/checkpoints/infrastructure/checkpoint.scheduler.ts`
- `themis-web/src/features/batch-approval/`
