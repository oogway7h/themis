import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Election, ElectionStatus } from '../domain/election.entity';
import type {
  CreateElectionInput,
  ElectionRepository,
  ListElectionsFilter,
  UpdateElectionInput,
} from '../domain/election.repository';
import { electionToDomain } from './election.mapper';

@Injectable()
export class PrismaElectionRepository implements ElectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateElectionInput): Promise<Election> {
    const row = await this.prisma.election.create({
      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
        registroInicio: input.registroInicio,
        registroFin: input.registroFin,
        votacionInicio: input.votacionInicio,
        votacionFin: input.votacionFin,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
        opciones: {
          create: input.opciones.map((option, index) => ({
            nombre: option.nombre,
            descripcion: option.descripcion,
            onChainIndex: index,
          })),
        },
      },
      include: { opciones: true },
    });

    return electionToDomain(row);
  }

  async update(id: string, input: UpdateElectionInput): Promise<Election> {
    const { opciones, ...rest } = input;

    if (opciones) {
      await this.prisma.$transaction([
        this.prisma.option.deleteMany({ where: { electionId: id } }),
        this.prisma.election.update({
          where: { id },
          data: {
            ...rest,
            opciones: {
              create: opciones.map((option, index) => ({
                nombre: option.nombre,
                descripcion: option.descripcion,
                onChainIndex: index,
              })),
            },
          },
        }),
      ]);
    } else {
      await this.prisma.election.update({ where: { id }, data: rest });
    }

    const row = await this.prisma.election.findUniqueOrThrow({
      where: { id },
      include: { opciones: true },
    });
    return electionToDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.election.delete({ where: { id } });
  }

  async findById(id: string): Promise<Election | null> {
    const row = await this.prisma.election.findUnique({
      where: { id },
      include: { opciones: true },
    });
    return row ? electionToDomain(row) : null;
  }

  async findMany(filter: ListElectionsFilter): Promise<Election[]> {
    const rows = await this.prisma.election.findMany({
      where: {
        nombre: filter.nombre
          ? { contains: filter.nombre, mode: 'insensitive' }
          : undefined,
        estado: filter.estado ?? (filter.estados ? { in: filter.estados } : undefined),
      },
      include: { opciones: true },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(electionToDomain);
  }

  async tryClaimCheckpoint(electionId: string, dueAtExpected: Date): Promise<boolean> {
    const result = await this.prisma.election.updateMany({
      where: {
        id: electionId,
        OR: [
          { lastCheckpointClosedAt: null },
          { lastCheckpointClosedAt: { lte: dueAtExpected } },
        ],
      },
      data: { lastCheckpointClosedAt: new Date() },
    });
    return result.count === 1;
  }

  async transitionStatus(
    electionId: string,
    from: ElectionStatus,
    to: ElectionStatus,
  ): Promise<boolean> {
    const result = await this.prisma.election.updateMany({
      where: { id: electionId, estado: from },
      data: { estado: to },
    });
    return result.count === 1;
  }

  async setOnChainGroup(electionId: string, onChainGroupId: string): Promise<void> {
    await this.prisma.election.update({
      where: { id: electionId },
      data: { onChainGroupId, onChainGroupCreatedAt: new Date() },
    });
  }

  async setMerkleRoot(electionId: string, merkleRoot: string): Promise<void> {
    await this.prisma.election.update({
      where: { id: electionId },
      data: { merkleRoot },
    });
  }
}
