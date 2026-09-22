import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conectado a PostgreSQL');
    try {
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "voter_participations" (
          "id" TEXT PRIMARY KEY,
          "election_id" TEXT NOT NULL,
          "scoped_token_hash" TEXT NOT NULL,
          "voted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT "voter_participations_election_scoped_unique" UNIQUE ("election_id", "scoped_token_hash")
        )
      `);
      await this.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "voter_participations_election_idx" ON "voter_participations" ("election_id")
      `);
      this.logger.log('Tabla voter_participations lista en PostgreSQL');
    } catch (err) {
      this.logger.error(`No se pudo inicializar tabla voter_participations: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(
        `PostgreSQL inalcanzable: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
