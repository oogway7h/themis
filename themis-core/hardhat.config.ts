import { config as loadEnv } from 'dotenv';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-verify';
import '@semaphore-protocol/hardhat';
import type { HardhatUserConfig } from 'hardhat/config';

loadEnv();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test/contracts',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // Testnet de produccion (ver docs/despliegue-base-sepolia.md). La misma
    // wallet despliega y despues es el RELAYER_PRIVATE_KEY del backend en EC2.
    // Variable aparte para no pisar la clave de Hardhat del .env local.
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      chainId: 84532,
      accounts: process.env.BASE_SEPOLIA_PRIVATE_KEY
        ? [process.env.BASE_SEPOLIA_PRIVATE_KEY]
        : [],
    },
  },
  // API v2 de Etherscan: una sola key sirve para BaseScan.
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? '',
  },
  sourcify: { enabled: false },
};

export default config;
