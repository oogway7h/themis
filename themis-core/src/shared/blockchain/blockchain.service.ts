import { Inject, Injectable, Logger } from '@nestjs/common';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { APP_CONFIG } from '../../config/configuration';
import type { AppConfig } from '../../config/configuration';

export const THEMIS_REGISTRY_ABI = [
  'function version() view returns (string)',
  'function pingCount() view returns (uint256)',
  'function ping() returns (uint256)',
  'event Pinged(address indexed sender, uint256 count)',
];

export interface ChainStatus {
  connected: boolean;
  chainId: number | null;
  blockNumber: number | null;
  relayerAddress: string | null;
  contractAddress: string | null;
  contractVersion: string | null;
  error: string | null;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;

  /// Cola de una sola via para todo lo que firma con la wallet del relayer.
  /// Hay una sola cuenta, asi que dos envios concurrentes leen el mismo nonce
  /// y el segundo se cae con NONCE_EXPIRED. Antes se mitigaba leyendo el nonce
  /// a mano con getTransactionCount('latest') en cada llamador, lo que no
  /// alcanza (dos lectores concurrentes obtienen el mismo valor).
  private queue: Promise<unknown> = Promise.resolve();

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    // cacheTimeout -1: ethers v6 cachea 250ms las lecturas RPC identicas, y con un nodo de
    // minado instantaneo (Hardhat) la 2da transaccion consecutiva del relayer reusa el nonce
    // cacheado de la 1ra (NONCE_EXPIRED). CU-09 envia createGroup y addMembers seguidas.
    this.provider = new JsonRpcProvider(config.chain.rpcUrl, undefined, {
      staticNetwork: true,
      cacheTimeout: -1,
    });
    this.wallet = new Wallet(config.chain.relayerPrivateKey, this.provider);
  }

  get relayerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Expuesto para que otros modulos (p. ej. checkpoints, para el registro
   * Semaphore) puedan construir su propio Contract con una ABI distinta a
   * THEMIS_REGISTRY_ABI, sin duplicar el provider/wallet del relayer.
   */
  getWallet(): Wallet {
    return this.wallet;
  }

  getProvider(): JsonRpcProvider {
    return this.provider;
  }

  /**
   * Serializa un envio on-chain contra la wallet del relayer: encadena sobre
   * los envios previos, asi el nonce manager de ethers nunca ve dos
   * transacciones en vuelo de la misma cuenta.
   *
   * Todo lo que mande una transaccion (no las lecturas) tiene que pasar por
   * aca. `label` solo va al log, para poder seguir el orden real de envio.
   */
  async sendSerialized<T>(label: string, fn: () => Promise<T>): Promise<T> {
    // El `catch` mantiene la cadena viva: si un envio falla, los siguientes
    // igual tienen que poder correr.
    const run = this.queue.then(
      () => fn(),
      () => fn(),
    );
    // Se encadena el resultado ya neutralizado para que un rechazo no quede
    // sin manejar en la cola misma.
    this.queue = run.catch(() => undefined);

    this.logger.debug(`Envio on-chain encolado: ${label}`);
    return run;
  }

  getRegistry(): Contract | null {
    if (!this.config.chain.contractAddress) {
      return null;
    }

    return new Contract(
      this.config.chain.contractAddress,
      THEMIS_REGISTRY_ABI,
      this.wallet,
    );
  }

  async getStatus(): Promise<ChainStatus> {
    const status: ChainStatus = {
      connected: false,
      chainId: null,
      blockNumber: null,
      relayerAddress: null,
      contractAddress: this.config.chain.contractAddress || null,
      contractVersion: null,
      error: null,
    };

    try {
      const network = await this.provider.getNetwork();
      status.chainId = Number(network.chainId);
      status.blockNumber = await this.provider.getBlockNumber();
      status.relayerAddress = this.wallet.address;
      status.connected = true;

      const registry = this.getRegistry();
      if (registry) {
        status.contractVersion = (await registry.version()) as string;
      }
    } catch (error) {
      status.error = (error as Error).message;
      this.logger.warn(`Blockchain inalcanzable: ${status.error}`);
    }

    return status;
  }
}
