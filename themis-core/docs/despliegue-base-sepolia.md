# Despliegue en Base Sepolia (producción / demo)

En local se sigue usando Hardhat (`localhost`, ver [insercion-onchain-semaphore.md](./insercion-onchain-semaphore.md)).
En AWS, los contratos viven en **Base Sepolia** (chainId `84532`), una testnet pública que persiste. Esto cambia
dos cosas respecto del nodo Hardhat efímero que antes corría en el `docker-compose.yml`:

- **Las direcciones no cambian nunca.** Se despliega una sola vez. Las direcciones son públicas y quedan
  commiteadas en `docker-compose.yml` y en `deployments/baseSepolia-semaphore.json`. No hay que volver a
  copiarlas en cada reinicio.
- **BaseScan es el testigo independiente.** Los contratos se verifican al desplegar, así que cada voto se ve en
  `https://sepolia.basescan.org/tx/<hash>` con el evento `ProofValidated` decodificado (groupId, nullifier,
  `message` = índice de la opción, raíz de Merkle). La auditoría web (CU-15) enlaza cada voto a esa página.

Las reglas 1 y 2 no cambian. Todas las tx las firma la wallet relayer, así que on-chain no aparece nada del
votante.

## Qué se despliega

`SemaphoreVerifier`, `PoseidonT3` y `ThemisSemaphoreRegistry`, igual que en local. `ThemisVoting` también se
despliega (lo hace el mismo script), pero el backend no lo usa: el voto va directo a `validateProof` del
registry. `ThemisRegistry` (`CONTRACT_ADDRESS`, el ping de demo) **no** se despliega.

## Una sola vez: desplegar

1. **Wallet nueva** para el relayer (nunca la clave #0 de Hardhat: con `CHAIN_ID != 31337` el backend se niega a
   arrancar si la detecta):
   ```bash
   node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
   ```
2. **Fondearla gratis** con un faucet. El ETH de testnet no se compra ni tiene valor. Faucets que no piden
   saldo en mainnet: [QuickNode](https://faucet.quicknode.com/base/sepolia) (cada 12 h) y
   [ZalalenA](https://faucet.zalalena.com/base). Alchemy y Chainstack **sí** piden saldo en mainnet, así que
   conviene evitarlos. Con un gas de ~0.006 gwei, un voto (~350k de gas) cuesta ~0.000002 ETH y el despliegue
   completo ~0.00004 ETH. Menos de 0.001 ETH de testnet alcanza para cientos de votos.
3. En `themis-core/.env` (local): `BASE_SEPOLIA_PRIVATE_KEY=<wallet nueva>` (aparte de `RELAYER_PRIVATE_KEY`,
   que sigue siendo la de Hardhat para desarrollo local), `BASE_SEPOLIA_RPC_URL` (opcional, el
   default es el RPC público) y `ETHERSCAN_API_KEY` (etherscan.io → API Keys; la API v2 cubre BaseScan).
4. Desplegar y verificar:
   ```bash
   pnpm chain:deploy:semaphore:base-sepolia
   ```
   El script imprime `SEMAPHORE_REGISTRY_ADDRESS` y `CHAIN_START_BLOCK`. Si la verificación falla (por ejemplo,
   el explorador todavía no indexó el contrato), se reintenta a mano:
   `pnpm hardhat verify --network baseSepolia --contract contracts/ThemisSemaphoreRegistry.sol:ThemisSemaphoreRegistry <address> <verifierAddress>`.
5. Pegar esos dos valores en `docker-compose.yml` (raíz) → `core.environment`, y commitear junto con
   `deployments/baseSepolia-semaphore.json`.

## En EC2

`themis-core/.env` lleva **solo secretos** (`chmod 600`):

```
RPC_URL=https://sepolia.base.org        # o la URL de Alchemy/Infura con tu key
RELAYER_PRIVATE_KEY=0x...               # la wallet fondeada
```

`CHAIN_ID`, `SEMAPHORE_REGISTRY_ADDRESS`, `CHAIN_START_BLOCK` y `EXPLORER_URL` vienen del `docker-compose.yml`.
Después: `git pull && docker compose up -d --build`. Ya no existe el contenedor `chain`.

Si la base de producción tiene elecciones creadas contra el Hardhat viejo, su `onChainGroupId` no existe en Base
Sepolia: hay que recrear la elección (por ejemplo, con `scripts/demo-eleccion-ficct-2026.ts`).

## Sincronización de eventos

`SyncVoteEventsUseCase` arranca en `CHAIN_START_BLOCK` (no en 0: `eth_getLogs` sobre millones de bloques lo
rechaza cualquier RPC) y avanza de a 2000 bloques por pasada del cron (una por minuto).

## Qué mirar para demostrar un voto

1. Auditoría web → elección → **"Votos registrados en la blockchain"** → clic en el hash de la tx.
2. En BaseScan: estado *Success*, bloque, `From` = wallet relayer (no el votante) y, en la pestaña **Logs**, el
   evento `ProofValidated`.
3. El link del contrato (arriba a la derecha de la tabla) → pestaña **Events**: todos los votos de todas las
   elecciones, en vivo.

## Riesgos conocidos

- **Saldo del relayer**: si se queda sin ETH, los votos fallan. Hay que revisarlo antes de cada demo.
- **Recibo del voto**: como `message` (la opción) es público, quien tenga un `txHash` sabe qué opción se votó en
  esa tx. Esto ya era así antes (es el diseño de Semaphore), y por eso el link no se muestra en la app del
  votante.
- **La clave en `.env`**: alcanza para una testnet. Con dinero real o varios hosts, pasar a AWS Secrets Manager/SSM.
