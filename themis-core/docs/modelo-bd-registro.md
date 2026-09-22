# Modelo de base de datos — Elecciones y registro (estado real)

> Esta copia vive en `themis-core/docs/` para que viaje con el repositorio. El original está en la carpeta `docs/` del workspace (fuera de los repos); si cambian el modelo de datos, actualiza esta.

> Este documento describe el modelo **tal como está implementado hoy** en `themis-core/prisma/schema.prisma`, con nombres de columnas reales. No es una copia del documento de diseño original que motivó este cambio — ver la sección "Correspondencia con el diseño original" para el mapeo entre ambos. Complementa `diseno-consolidado.md` (en la carpeta `docs/` del workspace, fuera de los repos), que sigue siendo la fuente de verdad de arquitectura y de los 15 CU.

## Implementado

### `elections` (modelo `Election`)

Registro maestro de cada proceso electoral. Cubre CU-01 (crear elección), CU-02 (padrón/árbol de Merkle) y CU-04 (checkpoints/límite de tasa) del lado Admin.

| Columna real | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `nombre` | varchar | — |
| `descripcion` | varchar? | — |
| `registro_inicio` / `registro_fin` | timestamp | Ventana de registro |
| `votacion_inicio` / `votacion_fin` | timestamp | Ventana de votación, no se solapa con la de registro |
| `estado` | enum `ElectionStatus` | `BORRADOR \| REGISTRO_ABIERTO \| REGISTRO_CERRADO \| VOTACION_ABIERTA \| CERRADA`. Lo avanza solo un cron según las fechas, ver "Ciclo de vida" abajo |
| `profundidad_arbol` | int? | Profundidad del árbol de Merkle — capacidad máxima = 2^profundidad |
| `elegibilidad_facultad` / `elegibilidad_carreras` / `elegibilidad_tipo_usuario` / `elegibilidad_estado_academico` | enum(s) | Criterio de elegibilidad del padrón (CU-02) |
| `checkpoint_interval_minutes` | int? | Frecuencia de cierre de lotes (rango [5,1440], default 60) |
| `rate_limit_threshold_per_minute` | int? | Umbral de registros/minuto antes de alertar (rango [1,10000], default 50) |
| `created_by` / `updated_by` | string | `sub` del admin de plataforma (`PlatformUser`) |

**Ciclo de vida (automático por fechas).** Un cron de `themis-core` (`AdvanceElectionLifecycleUseCase`, cada minuto) avanza `estado` según las cuatro fechas, **un paso por tick**:

| Transición | Cuándo |
|---|---|
| `BORRADOR → REGISTRO_ABIERTO` | `registroInicio <= ahora < registroFin`, **y** el padrón está configurado **y** hay exactamente 5 autoridades designadas. Si falta algo, sigue en `BORRADOR` y reintenta cada tick (aviso en el log). La política de checkpoint no es requisito: tiene valores por defecto |
| `REGISTRO_ABIERTO → REGISTRO_CERRADO` | `ahora >= registroFin` |
| `REGISTRO_CERRADO → VOTACION_ABIERTA` | `ahora >= votacionInicio` |
| `VOTACION_ABIERTA → CERRADA` | `ahora >= votacionFin` |

Una elección que sigue en `BORRADOR` cuando ya pasó `registroFin` nunca se abre. `REGISTRO_CERRADO` cubre el hueco entre `registroFin` y `votacionInicio`: ya no acepta registros nuevos, pero sí sigue aceptando la presentación de credenciales (el delay aleatorio de la app puede caer después del cierre) y ejecuta un único checkpoint final con lo que quedó pendiente. Cada cambio usa compare-and-swap (`ElectionRepository.transitionStatus`), así que dos ticks o dos instancias no lo aplican dos veces.

**No son columnas** (siguen siendo constantes fijas de código, `src/modules/elections/domain/election.constants.ts`): el mecanismo criptográfico (`CRYPTO_MECHANISM = 'SEMAPHORE'`) y el umbral de multisig (`MULTISIG_THRESHOLD = 3`). Ver "Fuera de alcance" más abajo.

### `options` (modelo `Option`) y `authorities` (modelo `Authority`)

Sin cambios en este pase — `options` son las opciones/candidatos de una elección (CU-01); `authorities` son las 5 cuentas de `platform_users` con rol `AUTORIDAD_REGISTRO` designadas para una elección (CU-03). El umbral 3-de-5 es la constante `MULTISIG_THRESHOLD`, no una columna.

### `registration_requests` (modelo `RegistrationRequest`) — nuevo, CU-05

> Documentación completa del flujo (incluye el protocolo de firma ciega paso a paso, rutas y variables de entorno): [`themis-core/src/modules/registration/README.md`](../src/modules/registration/README.md).

Cada solicitud individual de un votante para registrarse a una elección. **No contiene identidad real.**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `election_id` | uuid | FK → `elections.id` |
| `scoped_token_hash` | varchar | `HMAC-SHA256(SSO_MOCK_SECRET, sub + ":" + election_id)`. Único por `(election_id, scoped_token_hash)` — bloquea un segundo registro de la misma persona en la misma elección sin persistir el UUID real en ninguna tabla |
| `blinded_value` | text | Mensaje cegado (RSA blind signature, RFC 9474) — **cegado de verdad**, el backend nunca ve el identity commitment real. Ver README del módulo para el protocolo completo |
| `status` | enum `RegistrationRequestStatus` | `PENDING \| QUEUED \| BATCHED \| INSERTED \| REJECTED`. Esta iteración solo produce `PENDING` (ningún caso de uso mueve el estado más allá todavía) |
| `created_at` | timestamp | — |

Endpoints: `POST /elections/:electionId/registration-requests` (body `{ assertion, blindedMessage }`, responde `{ id, status, createdAt, blindSignature }`) y `GET /registration/public-key` (sin auth, para que el cliente ciegue el commitment). Sin sesión de cookie (JwtAuthGuard) — la regla 1 del CLAUDE.md raíz ("registro autenticado") se cumple verificando la `assertion` de `POST /mock-sso/login` dentro del caso de uso (`VerifyMockAssertionUseCase`), no con el sistema de auth de Admin/Autoridad.

**Limitación conocida:** la elegibilidad se valida contra el flag genérico `habilitado` de la assertion de mock-sso (fórmula fija: `facultad==='FICCT' && tipoUsuario==='ESTUDIANTE' && estadoAcademico==='ACTIVO'`), no contra los criterios específicos de cada elección (`elegibilidad_*` de CU-02) — la assertion no trae `carrera` ni `estado_academico`. Cerrar esta brecha requiere ampliar el payload de la assertion o consultar `mock_sso_users` de nuevo; queda pendiente.

### `presented_credentials` (modelo `PresentedCredential`) — nuevo, resuelve el gap de "cómo se inserta el commitment real"

> Documentación completa (protocolo, mitigación de correlación por timing, el bug de `Buffer`+`blindrsa-ts` encontrado y corregido): [`themis-core/src/modules/registration/README.md`](../src/modules/registration/README.md).

Segundo paso de CU-05, separado en el tiempo del registro y **sin ningún campo de identidad** — ni `scoped_token_hash`, ni nada que lo conecte con `registration_requests`. El dispositivo presenta la credencial certificada (commitment real + firma ya descegada) de forma anónima; la firma válida es la única prueba de habilitación.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `election_id` | uuid | FK → `elections.id` |
| `commitment` | text | El identity commitment **real**, en claro — a diferencia de `registration_requests.blinded_value`. Único por `(election_id, commitment)` |
| `prepared_message` | text | El mensaje realmente firmado (`random(32) \|\| commitment`, RFC 9474) — se guarda para trazabilidad |
| `signature` | text | Firma RSA ya descegada, verificada antes de persistir |
| `status` | enum `PresentedCredentialStatus` | `PENDING \| BATCHED \| INSERTED \| REJECTED` |
| `presented_at` | timestamp | — |

Endpoint: `POST /elections/:electionId/credentials/present` (body `{ preparedMessage, signature }`), sin ningún tipo de auth. Mitigación de correlación por timing: delay aleatorio del lado del cliente antes de llamarlo (documentado como parcial, no una garantía criptográfica) — pendiente reemplazar por el Relayer cuando exista (CU-10).

### `registration_batches` (modelo `RegistrationBatch`) — CU-07 / CU-08 / CU-09

Un lote cerrado automáticamente por el cron de checkpoint (`src/modules/checkpoints/`), que agrupa los `presented_credentials.commitment` pendientes al momento del cierre. Se arma siempre sobre el commitment real ya anónimo, nunca sobre `registration_requests`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `election_id` | uuid | FK → `elections.id` |
| `status` | enum `RegistrationBatchStatus` | `PENDING_APPROVAL \| APPROVED \| INSERTED \| INSERTION_FAILED` |
| `credential_count` | int | Cuántas credenciales entraron |
| `approvals_required` | int | Congela `MULTISIG_THRESHOLD` al cerrar (no se relee al aprobar) |
| `merkle_root_before` / `merkle_root_after` | text? | Raíz del grupo Semaphore antes/después de la inserción (`uint256` guardado como texto decimal) |
| `on_chain_tx_hash` / `on_chain_group_id` | text? | Transacción de `addMembers` y grupo Semaphore de la elección |
| `closed_at` / `approved_at` / `inserted_at` | timestamp | — |
| `failure_reason` | text? | Solo mientras el estado es `INSERTION_FAILED`; se limpia al insertarse por reintento |

### `batch_approvals` (modelo `BatchApproval`) — CU-08

Una fila = una aprobación de una autoridad sobre un lote. **El multisig 3-de-5 se implementa contando filas**, no con una columna "aprobado", y no son firmas criptográficas: el contrato on-chain no verifica ningún multisig, solo el backend cuenta las aprobaciones antes de enviar `addMembers` con la wallet relayer. `authority_id` referencia el asiento (`authorities.id`), no la cuenta, para que "la misma autoridad no aprueba dos veces" siga valiendo si se reemplaza la cuenta de un asiento. Único por `(batch_id, authority_id)`.

### `rate_alerts` (modelo `RateAlert`) — CU-06

Historial de "esto se registró más rápido de lo normal": ventana, cantidad de credenciales presentadas, umbral y severidad. Puramente informativo, no bloquea el registro. Cooldown de 10 min entre alertas de una misma elección.

`elections` además guarda `last_checkpoint_closed_at` (ancla del intervalo), `on_chain_group_id`, `on_chain_group_created_at` y `merkle_root` (raíz vigente tras la última inserción).

Endpoints (todos detrás de la cookie de sesión): `GET /elections/mine/authority`, `GET /elections/:id/batches`, `GET /elections/:id/batches/:batchId`, `POST /elections/:id/batches/:batchId/approvals` (solo `AUTORIDAD_REGISTRO`) y `GET /elections/:id/rate-alerts`. Detalle: [`themis-core/docs/checkpoint-lote-multisig.md`](./checkpoint-lote-multisig.md).

## Fuera de alcance (documentado, no implementado)

El documento de diseño original que motivó este cambio proponía un modelo más amplio, común a dos mecanismos criptográficos (Semaphore y firma de anillo enlazable). Este proyecto es exclusivamente Semaphore/zk-SNARKs (ver CLAUDE.md raíz), así que:

- **`mechanism` como columna por elección**: no se agregó. El proyecto usa un único mecanismo fijo (`CRYPTO_MECHANISM`), y el otro mecanismo del doc original (anillo enlazable) no es parte de este alcance.
- **`multisig_threshold` como columna por elección**: no se agregó. Sigue siendo la constante `MULTISIG_THRESHOLD = 3`. Convertirla en configurable por elección es un cambio de diseño más amplio (afecta CU-03/CU-08), no necesario para que el registro funcione.
- **`RELAYERS`**, **`VOTE_SUBMISSIONS`**: envío/relay de votos (CU-09 a CU-11). No implementado. El Relayer, cuando exista, también debería intermediar `POST /elections/:id/credentials/present` (ver README del módulo) — no solo el voto.
- **`CHAIN_SYNC_STATE`**: sincronización con la blockchain (CU-13, auditoría). No implementado. El contrato de registro ya es real (`themis-core/contracts/ThemisSemaphoreRegistry.sol`, wrapper del Semaphore v4 oficial); `ThemisRegistry.sol` sigue siendo solo andamiaje (`version()`/`ping()`).

**Ya implementado, actualización sobre versiones anteriores de este documento:** tanto el cegado real (RSA blind signature, RFC 9474) como la presentación anónima de la credencial (`presented_credentials`) ya están implementados — el gap de "cómo se inserta el commitment real en el árbol" está resuelto de punta a punta: el checkpoint consume `presented_credentials`, las autoridades aprueban el lote (API y pantalla en `themis-web`) y la inserción en el grupo Semaphore on-chain es real.

## Correspondencia con el diseño original

| Concepto del documento original | Campo/decisión real |
|---|---|
| `ELECTIONS.capacity_param` | `elections.profundidad_arbol` (capacidad = 2^profundidad) |
| `ELECTIONS.checkpoint_interval_minutes` | `elections.checkpoint_interval_minutes` (mismo nombre, ya existía antes de este cambio) |
| `ELECTIONS.rate_alert_threshold` | `elections.rate_limit_threshold_per_minute` |
| `ELECTIONS.status` | `elections.estado` (enum en español) |
| `ELECTIONS.mechanism` | Constante fija `CRYPTO_MECHANISM`, no columna |
| `ELECTIONS.multisig_threshold` | Constante fija `MULTISIG_THRESHOLD`, no columna |
| `REGISTRATION_REQUESTS` | `registration_requests` (campos equivalentes, `batch_id` pendiente) |
| — (no estaba en el doc original) | `presented_credentials` — segundo paso anónimo, necesario porque `registration_requests.blinded_value` nunca es el commitment real |
| `REGISTRATION_BATCHES`, `BATCH_APPROVALS`, `RATE_ALERTS` | `registration_batches`, `batch_approvals`, `rate_alerts` (implementadas, ver arriba) |
| `RELAYERS`, `VOTE_SUBMISSIONS`, `CHAIN_SYNC_STATE` | Sin implementar — diseño de referencia para la Fase 2 (CU-10 en adelante) |
