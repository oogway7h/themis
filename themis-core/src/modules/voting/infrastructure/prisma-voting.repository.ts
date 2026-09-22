import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  CreateVoteReceiptData,
  PublicElectionDetail,
  VotingRepository,
} from '../domain/voting.repository';
import type { VoteReceiptEntity } from '../domain/vote-receipt.entity';

@Injectable()
export class PrismaVotingRepository implements VotingRepository {
  private readonly logger = new Logger(PrismaVotingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findPublicActiveElections(): Promise<PublicElectionDetail[]> {
    const rows = await this.prisma.election.findMany({
      where: {
        estado: {
          in: ['VOTACION_ABIERTA', 'REGISTRO_ABIERTO', 'REGISTRO_CERRADO'],
        },
      },
      include: {
        opciones: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { votacionInicio: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      estado: r.estado,
      votacionInicio: r.votacionInicio,
      votacionFin: r.votacionFin,
      onChainGroupId: r.onChainGroupId,
      merkleRoot: r.merkleRoot,
      opciones: r.opciones.map((o) => ({
        id: o.id,
        nombre: o.nombre,
        descripcion: o.descripcion,
        onChainIndex: o.onChainIndex,
      })),
    }));
  }

  async findPublicElectionById(id: string): Promise<PublicElectionDetail | null> {
    const r = await this.prisma.election.findUnique({
      where: { id },
      include: {
        opciones: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      estado: r.estado,
      votacionInicio: r.votacionInicio,
      votacionFin: r.votacionFin,
      onChainGroupId: r.onChainGroupId,
      merkleRoot: r.merkleRoot,
      opciones: r.opciones.map((o) => ({
        id: o.id,
        nombre: o.nombre,
        descripcion: o.descripcion,
        onChainIndex: o.onChainIndex,
      })),
    };
  }

  async findVoteReceiptByNullifier(nullifier: string): Promise<VoteReceiptEntity | null> {
    const row = await this.prisma.voteReceipt.findUnique({
      where: { nullifier },
    });

    if (!row) return null;

    return {
      id: row.id,
      electionId: row.electionId,
      optionId: row.optionId,
      nullifier: row.nullifier,
      txHash: row.txHash,
      createdAt: row.createdAt,
    };
  }

  async saveVoteReceipt(data: CreateVoteReceiptData): Promise<VoteReceiptEntity> {
    const row = await this.prisma.voteReceipt.create({
      data: {
        electionId: data.electionId,
        optionId: data.optionId,
        nullifier: data.nullifier,
        txHash: data.txHash,
      },
    });

    return {
      id: row.id,
      electionId: row.electionId,
      optionId: row.optionId,
      nullifier: row.nullifier,
      txHash: row.txHash,
      createdAt: row.createdAt,
    };
  }

  async findInsertedCommitmentsByElectionId(electionId: string): Promise<string[]> {
    const rows = await this.prisma.presentedCredential.findMany({
      where: {
        electionId,
        status: 'INSERTED',
      },
      select: { commitment: true },
      orderBy: { presentedAt: 'asc' },
    });

    return rows.map((r) => r.commitment);
  }

  async markVoterHasVoted(electionId: string, scopedTokenHash: string): Promise<void> {
    const id = randomUUID();
    try {
      await this.prisma.$executeRaw`
        INSERT INTO "voter_participations" ("id", "election_id", "scoped_token_hash", "voted_at")
        VALUES (${id}, ${electionId}, ${scopedTokenHash}, NOW())
        ON CONFLICT ("election_id", "scoped_token_hash") DO NOTHING
      `;
      this.logger.log(
        `Voto asentado en padrón para elector (${scopedTokenHash.substring(0, 10)}...) en elección ${electionId}`,
      );
    } catch (err) {
      this.logger.error(
        `Error al asentar voto en padrón: ${(err as Error).message}`,
      );
    }
  }

  async hasVoterVoted(electionId: string, scopedTokenHash: string): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*)::bigint as count FROM "voter_participations"
        WHERE "election_id" = ${electionId} AND "scoped_token_hash" = ${scopedTokenHash}
      `;
      const hasVoted = Number(rows[0]?.count ?? 0) > 0;
      this.logger.log(
        `Consulta de participación para elector (${scopedTokenHash.substring(0, 10)}...): ${hasVoted ? 'YA VOTO' : 'NO HA VOTADO'}`,
      );
      return hasVoted;
    } catch (err) {
      this.logger.error(
        `Error consultando hasVoterVoted: ${(err as Error).message}`,
      );
      return false;
    }
  }

  async isVoterRegistered(electionId: string, scopedTokenHash: string): Promise<boolean> {
    const row = await this.prisma.registrationRequest.findUnique({
      where: {
        electionId_scopedTokenHash: {
          electionId,
          scopedTokenHash,
        },
      },
      select: { id: true },
    });
    return row !== null;
  }
}
