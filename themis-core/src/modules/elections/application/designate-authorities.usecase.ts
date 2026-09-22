import { Inject, Injectable } from '@nestjs/common';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import {
  AUTHORITY_REPOSITORY,
  AuthorityRepository,
  DesignateAuthorityInput,
} from '../domain/authority.repository';
import { Authority } from '../domain/authority.entity';
import { assertExactQuota } from './authority-validation';
import {
  ElectionNotFoundError,
  AuthorityElectionClosedError,
  AuthorityAccountNotFoundError,
  AuthorityAccountInvalidRoleError,
  AuthorityAccountInactiveError,
  AuthorityAlreadyDesignatedError,
} from './election.errors';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../../auth/domain/platform-user.repository';

@Injectable()
export class DesignateAuthoritiesUseCase {
  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly platformUserRepository: PlatformUserRepository,
  ) {}

  async execute(
    electionId: string,
    inputs: DesignateAuthorityInput[],
    actorId: string,
  ): Promise<Authority[]> {
    const election = await this.electionRepository.findById(electionId);
    if (!election) {
      throw new ElectionNotFoundError();
    }
    if (election.estado === 'CERRADA') {
      throw new AuthorityElectionClosedError();
    }

    assertExactQuota(inputs);

    const existing = await this.authorityRepository.findByElection(electionId);
    if (existing.length > 0) {
      throw new AuthorityAlreadyDesignatedError();
    }

    for (const input of inputs) {
      const account = await this.platformUserRepository.findById(input.platformUserId);
      if (!account) {
        throw new AuthorityAccountNotFoundError();
      }
      if (account.role !== 'AUTORIDAD_REGISTRO') {
        throw new AuthorityAccountInvalidRoleError();
      }
      if (!account.isActive) {
        throw new AuthorityAccountInactiveError();
      }
    }

    try {
      return await this.authorityRepository.designateAll(electionId, inputs, actorId);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new AuthorityAlreadyDesignatedError();
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
