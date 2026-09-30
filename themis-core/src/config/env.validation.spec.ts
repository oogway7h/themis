import { validateEnv } from './env.validation';

const HARDHAT_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const base = {
  DATABASE_URL: 'postgres://x',
  DIRECT_URL: 'postgres://x',
  JWT_SECRET: 'x'.repeat(16),
  AI_SERVICE_URL: 'http://ai',
  AI_SERVICE_TOKEN: 't',
  RPC_URL: 'http://rpc',
  SSO_MOCK_SECRET: 'x'.repeat(32),
  REGISTRATION_SIGNING_PRIVATE_KEY_JWK: '{}',
  REGISTRATION_SIGNING_PUBLIC_KEY_JWK: '{}',
};

describe('validateEnv', () => {
  it('acepta la clave de Hardhat en la red local', () => {
    expect(validateEnv({ ...base, CHAIN_ID: '31337', RELAYER_PRIVATE_KEY: HARDHAT_KEY }).CHAIN_ID).toBe(31337);
  });

  it('rechaza la clave de Hardhat en una red real', () => {
    expect(() =>
      validateEnv({ ...base, CHAIN_ID: '84532', RELAYER_PRIVATE_KEY: HARDHAT_KEY }),
    ).toThrow(/RELAYER_PRIVATE_KEY/);
  });
});
