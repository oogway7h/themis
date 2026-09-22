import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { APP_CONFIG, buildConfig } from './configuration';
import { validateEnv } from './env.validation';
import type { Env } from './env.validation';
import type { AppConfig } from './configuration';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [
    {
      provide: APP_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AppConfig => {
        const env = {
          NODE_ENV: configService.get('NODE_ENV'),
          PORT: configService.get('PORT'),
          API_PREFIX: configService.get('API_PREFIX'),
          CORS_ORIGINS: configService.get('CORS_ORIGINS'),
          DATABASE_URL: configService.get('DATABASE_URL'),
          DIRECT_URL: configService.get('DIRECT_URL'),
          JWT_SECRET: configService.get('JWT_SECRET'),
          AI_SERVICE_URL: configService.get('AI_SERVICE_URL'),
          AI_SERVICE_TOKEN: configService.get('AI_SERVICE_TOKEN'),
          AI_SERVICE_TIMEOUT_MS: configService.get('AI_SERVICE_TIMEOUT_MS'),
          RPC_URL: configService.get('RPC_URL'),
          CHAIN_ID: configService.get('CHAIN_ID'),
          RELAYER_PRIVATE_KEY: configService.get('RELAYER_PRIVATE_KEY'),
          CONTRACT_ADDRESS: configService.get('CONTRACT_ADDRESS'),
          SEMAPHORE_REGISTRY_ADDRESS: configService.get(
            'SEMAPHORE_REGISTRY_ADDRESS',
          ),
          VOTING_CONTRACT_ADDRESS: configService.get('VOTING_CONTRACT_ADDRESS'),
          SSO_MOCK_SECRET: configService.get('SSO_MOCK_SECRET'),
          SSO_MOCK_TOKEN_TTL_SECONDS: configService.get(
            'SSO_MOCK_TOKEN_TTL_SECONDS',
          ),
          REGISTRATION_SIGNING_PRIVATE_KEY_JWK: configService.get(
            'REGISTRATION_SIGNING_PRIVATE_KEY_JWK',
          ),
          REGISTRATION_SIGNING_PUBLIC_KEY_JWK: configService.get(
            'REGISTRATION_SIGNING_PUBLIC_KEY_JWK',
          ),
        };

        return buildConfig(env as Env);
      },
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
