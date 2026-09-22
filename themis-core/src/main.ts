import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_CONFIG } from './config/configuration';
import type { AppConfig } from './config/configuration';
import { DomainErrorFilter } from './shared/errors/domain-error.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<AppConfig>(APP_CONFIG);

  app.use(cookieParser());
  app.setGlobalPrefix(config.apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new DomainErrorFilter());
  const allowedOrigins =
    config.nodeEnv === 'development'
      ? (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (
            !origin ||
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
            config.corsOrigins.includes(origin)
          ) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        }
      : config.corsOrigins;
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Themis Core API')
    .setDescription('Backend, relayer y contratos de Themis')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.port, '0.0.0.0');

  const logger = new Logger('bootstrap');
  logger.log(`themis-core escuchando en http://localhost:${config.port}`);
  logger.log(`API en /${config.apiPrefix}  -  Swagger en /docs`);
}

void bootstrap();
