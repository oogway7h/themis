import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RegistrationRequest } from '../domain/registration-request.entity';
import type {
  CreateRegistrationRequestInput,
  RegistrationRequestRepository,
} from '../domain/registration-request.repository';
import { registrationRequestToDomain } from './registration-request.mapper';

@Injectable()
export class PrismaRegistrationRequestRepository implements RegistrationRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRegistrationRequestInput): Promise<RegistrationRequest> {
    const row = await this.prisma.registrationRequest.create({
      data: {
        electionId: input.electionId,
        scopedTokenHash: input.scopedTokenHash,
        blindedValue: input.blindedValue,
      },
    });
    return registrationRequestToDomain(row);
  }

  async findByElectionAndScopedTokenHash(
    electionId: string,
    scopedTokenHash: string,
  ): Promise<RegistrationRequest | null> {
    const row = await this.prisma.registrationRequest.findUnique({
      where: { electionId_scopedTokenHash: { electionId, scopedTokenHash } },
    });
    return row ? registrationRequestToDomain(row) : null;
  }
}
