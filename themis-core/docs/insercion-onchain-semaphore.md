# Inserción on-chain de los lotes (CU-09)

Cómo llegan los commitments aprobados al árbol de Semaphore de la blockchain, cómo desplegarlo, cómo
comprobar que funcionó y qué problemas conocidos hay. El flujo de aprobación que la dispara está en
[`checkpoint-lote-multisig.md`](./checkpoint-lote-multisig.md).

## Qué se despliega

- `contracts/ThemisSemaphoreRegistry.sol`: wrapper delgado, sin cambios de comportamiento, sobre el
  `Semaphore.sol` oficial (`@semaphore-protocol/contracts` 4.x). El nombre propio solo sirve para que el
  registro de despliegue y las variables de entorno se lean "Themis". Ofrece `createGroup`, `addMembers`,
  `getMerkleTreeRoot`, `hasMember`, y `validateProof`/`verifyProof` para la Fase 2.
- `contracts/ThemisRegistry.sol` sigue siendo solo andamiaje (`version()`/`ping()`); no participa.
- **Un grupo Semaphore por elección**, creado perezosamente en la primera inserción. La wallet relayer del
  backend es el `admin` del grupo: es la única cuenta que puede llamar `addMembers`.
- Semaphore v4 usa un árbol de **profundidad dinámica** (LeanIMT). `Election.profundidadArbol` **no** se
  pasa al contrato: es solo un tope de capacidad de aplicación (2^profundidad). El diseño original asumía
  profundidad fija porque describía Semaphore v3.

## Despliegue local

Necesitas el nodo, y **los dos deploys, en este orden**:

```bash
pnpm chain:node                      # terminal 1, déjala abierta
pnpm chain:deploy:local              # ThemisRegistry
pnpm chain:deploy:semaphore:local    # verificador + Poseidon + ThemisSemaphoreRegistry
```

Cada script imprime la línea para tu `.env`:

```
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
SEMAPHORE_REGISTRY_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

Con un nodo recién iniciado y ese orden, las direcciones son **siempre las mismas** (dependen del nonce de
la cuenta que despliega), así que el `.env` no cambia. Si despliegas en otro orden, o el relayer ya envió
transacciones a ese nodo, las direcciones cambian y hay que actualizar el `.env` y reiniciar el backend.

`SEMAPHORE_REGISTRY_ADDRESS` debe estar en **tres** sitios del backend: `src/config/env.validation.ts`,
`src/config/configuration.ts` y la lista explícita de `src/config/config.module.ts` (esta última se olvida
fácil y `tsc` no la detecta por un cast). Si falta, el backend arranca pero la inserción falla con un
mensaje claro.

## Cómo funciona la inserción

`SemaphoreOnChainService` (`src/modules/checkpoints/infrastructure/semaphore-onchain.service.ts`)
implementa `SemaphoreOnChainPort.insertBatch(electionId, commitments)`:

1. **Grupo**: si `Election.onChainGroupId` está vacío, exige que `profundidadArbol` esté configurado, llama
   `createGroup(relayer, 3600)` y lee el `groupId` del evento `GroupCreated`.
2. **Reintento seguro**: consulta `hasMember` de cada commitment. Si **todos** ya son miembros, no reenvía la
   transacción y devuelve la raíz actual (limpia un lote atascado). Si **solo algunos** lo son (inserción
   parcial), falla con un mensaje pidiendo revisión manual, en vez de arriesgar un duplicado.
3. **`addMembers`** con los commitments, espera el recibo y lee `getMerkleTreeRoot`.
4. Devuelve `{ txHash, newRoot, groupId }`. Cualquier error se propaga como `Error`: quien llama
   (`ApproveBatchUseCase` o `RetryPendingInsertionsUseCase`) lo captura y deja el lote en
   `INSERTION_FAILED` con el mensaje en `failureReason`.

La 3ª aprobación dispara la inserción **en el mismo request**. Si falla, el cron de reintento
(`EVERY_5_MINUTES`, en los minutos múltiplos de 5) la retoma sola, sin volver a aprobar.

`merkleTreeDuration = 3600` s (1 hora, el valor por defecto de Semaphore): una raíz anterior sigue siendo
válida ese tiempo para verificar pruebas. Con 0, una prueba hecha contra una raíz que ya no es la vigente
falla en cuanto se inserta otro lote. **Solo aplica a grupos nuevos**; los grupos creados antes de este
cambio conservan 0.

## Cómo comprobar que están en la cadena

El portal muestra `onChainTxHash` y `merkleRootAfter`, pero esos datos vienen del backend. La prueba
independiente es leer el contrato. Desde `themis-core`, con el nodo levantado (guarda como
`verificar-cadena.js` y córrelo con `node`):

```js
const { JsonRpcProvider, Contract } = require('ethers');
const abi = [
  'function groupCounter() view returns (uint256)',
  'function getGroupAdmin(uint256) view returns (address)',
  'function getMerkleTreeSize(uint256) view returns (uint256)',
  'function getMerkleTreeRoot(uint256) view returns (uint256)',
  'function hasMember(uint256,uint256) view returns (bool)',
];
(async () => {
  const c = new Contract(process.env.SEMAPHORE_REGISTRY_ADDRESS, abi, new JsonRpcProvider('http://127.0.0.1:8545'));
  const n = await c.groupCounter();
  for (let g = 0n; g < n; g++) {
    console.log(`grupo ${g}: miembros=${await c.getMerkleTreeSize(g)} raiz=${await c.getMerkleTreeRoot(g)}`);
  }
  // para un commitment concreto (de presented_credentials.commitment):
  // console.log(await c.hasMember(0n, BigInt('<commitment>')));
})();
```

Qué debe cumplirse: `miembros` = credenciales de los lotes `INSERTED` de esa elección; `raiz` = la
`merkle_root` de `elections`; `hasMember` verdadero para cada commitment `INSERTED`. Con **un** solo
miembro la raíz es igual a ese commitment (la raíz de un árbol de una hoja es la hoja); no es un error.

## Problemas conocidos

| Síntoma | Causa | Qué hacer |
|---|---|---|
| Lote en `INSERTION_FAILED` con `No se encontro el evento GroupCreated` | La cadena se **reinició** y los contratos no se redesplegaron. Llamar a una dirección sin código "tiene éxito" (`status 1`) pero no ejecuta nada ni emite eventos | Reinicia el nodo, corre los dos deploys en orden y espera al cron de reintento. No hace falta reaprobar |
| `NONCE_EXPIRED` / `Nonce too low` al insertar | ethers v6 cachea 250 ms las lecturas RPC; con un nodo de minado instantáneo la 2ª transacción seguida reusa el nonce de la 1ª | Ya corregido: `cacheTimeout: -1` en `BlockchainService` |
| `HH411: The library ... is not installed` al compilar | Hardhat no resuelve dependencias transitivas con pnpm | `poseidon-solidity` y `@zk-kit/lean-imt.sol` están como `devDependencies` a propósito; no las quites |
| `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` al terminar un deploy en Windows | Crash de Node/libuv al **cerrar** el proceso, después de terminar el trabajo | Inofensivo si viste la línea con la dirección; el código de salida es distinto de 0, no encadenes con `&&` |
| `EPERM ... query_engine-windows.dll.node` al correr `prisma generate` | El backend en modo watch tiene bloqueada la DLL | Detén el backend (y su proceso hijo de Node, no solo el `pnpm`) antes de regenerar |
| `no tiene profundidadArbol configurado` | La elección no tiene el padrón configurado | Configura el padrón antes de abrir el registro (el ciclo de vida ya lo exige) |
| Un lote recuperado por reintento mostraba el error viejo | `markInserted` no limpiaba `failureReason` | Ya corregido |

## Limitaciones de diseño (no son bugs)

- **El multisig no es criptográfico.** Las "3 de 5 aprobaciones" son 3 filas en `batch_approvals`; el
  contrato no las verifica. Quien controla la llave del relayer inserta lo que el backend le indique.
- **Un solo relayer**: una wallet del backend, que además es la admin de cada grupo. El relayer real
  (varios, anónimos) es parte de la Fase 2.
- Los commitments quedan en claro on-chain (son públicos por diseño), pero ningún dato del backend los
  vincula con una persona.
