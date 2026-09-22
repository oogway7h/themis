import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PresentedCredential } from '../domain/presented-credential.entity';
import type {
  CreatePresentedCredentialInput,
  PresentedCredentialRepository,
} from '../domain/presented-credential.repository';
import { presentedCredentialToDomain } from './presented-credential.mapper';

@Injectable()
export class PrismaPresentedCredentialRepository implements PresentedCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePresentedCredentialInput): Promise<PresentedCredential> {
    const row = await this.prisma.presentedCredential.create({
      data: {
        electionId: input.electionId,
        commitment: input.commitment,
        preparedMessage: input.preparedMessage,
        signature: input.signature,
        status: input.status ?? 'PENDING',
      },
    });
    return presentedCredentialToDomain(row);
  }

  async updateStatus(
    electionId: string,
    commitment: string,
    status: any,
  ): Promise<PresentedCredential> {
    const row = await this.prisma.presentedCredential.update({
      where: { electionId_commitment: { electionId, commitment } },
      data: { status },
    });
    return presentedCredentialToDomain(row);
  }

  async findByElectionAndCommitment(
    electionId: string,
    commitment: string,
  ): Promise<PresentedCredential | null> {
    const row = await this.prisma.presentedCredential.findUnique({
      where: { electionId_commitment: { electionId, commitment } },
    });
    return row ? presentedCredentialToDomain(row) : null;
  }

  async findPendingByElection(electionId: string): Promise<PresentedCredential[]> {
    const rows = await this.prisma.presentedCredential.findMany({
      where: { electionId, status: 'PENDING' },
    });
    return rows.map(presentedCredentialToDomain);
  }

  async countPresentedBetween(electionId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.presentedCredential.count({
      where: { electionId, presentedAt: { gte: from, lt: to } },
    });
  }

  async findByBatch(batchId: string): Promise<PresentedCredential[]> {
    // Orden deterministico (defensivo): la fuente de verdad real del orden
    // on-chain es RegistrationBatch.onChainMemberCommitments (CU-10), pero
    // esto evita que el propio envio a addMembers sea no-determinista.
    const rows = await this.prisma.presentedCredential.findMany({
      where: { batchId },
      orderBy: [{ presentedAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(presentedCredentialToDomain);
  }
}
