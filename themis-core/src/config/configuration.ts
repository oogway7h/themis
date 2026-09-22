import type { Env } from './env.validation';

export interface AppConfig {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  database: {
    url: string;
    directUrl: string;
  };
  jwt: {
    secret: string;
  };
  ai: {
    baseUrl: string;
    token: string;
    timeoutMs: number;
  };
  chain: {
    rpcUrl: string;
    chainId: number;
    relayerPrivateKey: string;
    contractAddress: string;
    semaphoreRegistryAddress: string;
    votingContractAddress?: string;
  };
  ssoMock: {
    secret: string;
    tokenTtlSeconds: number;
  };
  registrationSigning: {
    privateKeyJwk: string;
    publicKeyJwk: string;
  };
}

export function buildConfig(env: Env): AppConfig {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    database: {
      url: env.DATABASE_URL,
      directUrl: env.DIRECT_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
    },
    ai: {
      baseUrl: env.AI_SERVICE_URL.replace(/\/+$/, ''),
      token: env.AI_SERVICE_TOKEN,
      timeoutMs: env.AI_SERVICE_TIMEOUT_MS,
    },
    chain: {
      rpcUrl: env.RPC_URL,
      chainId: env.CHAIN_ID,
      relayerPrivateKey: env.RELAYER_PRIVATE_KEY,
      contractAddress: env.CONTRACT_ADDRESS,
      semaphoreRegistryAddress: env.SEMAPHORE_REGISTRY_ADDRESS,
      votingContractAddress: env.VOTING_CONTRACT_ADDRESS,
    },
    ssoMock: {
      secret: env.SSO_MOCK_SECRET,
      tokenTtlSeconds: env.SSO_MOCK_TOKEN_TTL_SECONDS,
    },
    registrationSigning: {
      privateKeyJwk: env.REGISTRATION_SIGNING_PRIVATE_KEY_JWK,
      publicKeyJwk: env.REGISTRATION_SIGNING_PUBLIC_KEY_JWK,
    },
  };
}

export const APP_CONFIG = 'APP_CONFIG';
