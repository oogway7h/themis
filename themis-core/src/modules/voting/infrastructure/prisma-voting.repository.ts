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
