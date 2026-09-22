# Checkpoint — aprobación de lotes con multisig (CU-08, pantalla)

> Estado: **implementado** en `src/features/batch-approval/`. El backend está en `themis-core`
> (detalle: `themis-core/docs/checkpoint-lote-multisig.md`). Esta es la única parte del bloque CU-06 a
> CU-09 marcada como "Web" en el diseño: la pantalla donde las autoridades revisan y aprueban los lotes.

## Qué hace

- **`AUTORIDAD_REGISTRO`**: menú lateral "Mis elecciones" → lista de sus elecciones → lotes de la
  elección → detalle del lote → **Aprobar lote** (con diálogo de confirmación).
- **`ADMIN`**: desde el detalle de una elección, botón "Ver lotes". Ve la lista y el detalle en solo
  lectura (sin botón de aprobar).
- **`AUDITOR`**: el backend le permite leer lotes, pero hoy no tiene forma de listar elecciones
  (`GET /elections` es solo ADMIN), así que no tiene pantalla.

## Rutas (`src/routes/_authenticated/`)

| Ruta | Guarda | Pantalla |
|---|---|---|
| `/authority/elections` | `requireAutoridadRegistro` | `MyElectionsPage` |
| `/elections/$electionId/batches` | `requireBatchViewer` (ADMIN + AUTORIDAD_REGISTRO) | `BatchesPage` |
| `/elections/$electionId/batches/$batchId` | `requireBatchViewer` | `BatchDetailPage` |

`requireBatchViewer` está en `features/auth/lib/role-guards.ts`.

## Qué muestra el detalle de un lote

Tamaño del lote, fecha de cierre, estado (`BatchStatusBadge`), progreso "X de N aprobaciones" (N sale
de `approvalsRequired`, no está fijo en 3) y la lista de `rolDescriptivo` de quienes ya aprobaron
(**nunca** identidad real ni commitments). El botón Aprobar solo aparece para `AUTORIDAD_REGISTRO` y
está deshabilitado si ya aprobó o el lote no está en `PENDING_APPROVAL`.

| Estado | Qué se ve |
|---|---|
| `PENDING_APPROVAL` | Progreso y botón Aprobar |
| `APPROVED` | "Se alcanzó el número de aprobaciones, insertando en la cadena" |
| `INSERTED` | Hash de la transacción y raíz del árbol, de solo lectura |
| `INSERTION_FAILED` | "La aprobación quedó registrada, el sistema reintentará", sin botón de reintento y **sin** mostrar `failureReason` (es un error técnico largo) |

Las pantallas de lista y detalle se refrescan solas cada 15 s (otras autoridades aprueban en
paralelo); el detalle deja de refrescarse al llegar a `INSERTED`.

## Errores

`ApiError` (`src/api/client.ts`) ahora trae `code`, el código de dominio del cuerpo `{code, message}` de
themis-core. `lib/approve-error-message.ts` lo traduce: `BATCH_ALREADY_APPROVED_BY_AUTHORITY`,
`BATCH_NOT_PENDING_APPROVAL`, `AUTHORITY_NOT_DESIGNATED_FOR_ELECTION`, `BATCH_NOT_FOUND`. `message` sigue
siendo el genérico de siempre.

## Notas de implementación

- El estado del lote usa `Badge`, no `StatusBadge` (ese solo muestra "conectado/sin conexión").
- Las autoridades no pueden pedir `GET /elections/:id` (es ADMIN-only); por eso la lista sale de
  `GET /elections/mine/authority` y las pantallas de lotes no muestran el nombre de la elección.
- No se agregó `dialog.tsx`: la confirmación usa `AlertDialog`, que ya existía.
- Fuera de alcance: pantalla de alertas de ritmo (CU-06, el endpoint `GET /elections/:id/rate-alerts`
  existe; candidato natural a una pestaña "Alertas" en `ElectionDetailPage`).

## Tests

`use-approve-batch.test.tsx` (invalida detalle y lista), `BatchDetailPage.test.tsx` (botón por rol y por
estado, mensajes por `code`, no expone el error crudo), `role-guards.test.ts`, y `api/client.test.ts`
(expone `code`).
