import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api/v1'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),

  AI_SERVICE_URL: z.string().min(1),
  AI_SERVICE_TOKEN: z.string().min(1),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  RPC_URL: z.string().min(1),
  CHAIN_ID: z.coerce.number().int().positive().default(31337),
  RELAYER_PRIVATE_KEY: z.string().min(1),
  CONTRACT_ADDRESS: z.string().default(''),
  SEMAPHORE_REGISTRY_ADDRESS: z.string().default(''),
  VOTING_CONTRACT_ADDRESS: z.string().default(''),

  SSO_MOCK_SECRET: z.string().min(32),
  // 1 hora: el flujo del votante (login -> registro -> delay de presentacion
  // -> voto) no cabe en 5 minutos, y ese TTL corto era la razon por la que la
  // verificacion de expiracion se salteaba del todo.
  SSO_MOCK_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  // JWK (JSON) de la clave RSA-PSS de firma ciega de registro (CU-05).
  // Generar con: pnpm registration:generate-signing-key
  REGISTRATION_SIGNING_PRIVATE_KEY_JWK: z.string().min(1),
  REGISTRATION_SIGNING_PUBLIC_KEY_JWK: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Variables de entorno invalidas o ausentes:\n${details}\n\nRevisa .env contra .env.example`,
    );
  }

  return result.data;
}
