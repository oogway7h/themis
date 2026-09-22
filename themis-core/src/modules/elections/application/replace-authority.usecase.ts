import { Inject, Injectable } from '@nestjs/common';
import {
  AUTHORITY_REPOSITORY,
  AuthorityRepository,
  ReplaceAuthorityInput,
} from '../domain/authority.repository';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import {
  AuthorityNotFoundError,
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
import { AuthorityWithEmail } from './list-authorities.usecase';

export interface ReplaceAuthorityUseCaseInput {
  platformUserId?: string;
  rolDescriptivo?: string;
}

@Injectable()
export class ReplaceAuthorityUseCase {
  constructor(
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly platformUserRepository: PlatformUserRepository,
  ) {}

  async execute(
    electionId: string,
    authorityId: string,
    input: ReplaceAuthorityUseCaseInput,
    actorId: string,
  ): Promise<AuthorityWithEmail> {
    const authority = await this.authorityRepository.findById(authorityId);
    if (!authority || authority.electionId !== electionId) {
      throw new AuthorityNotFoundError();
    }

    const election = await this.electionRepository.findById(authority.electionId);
    if (!election || election.estado === 'CERRADA') {
      throw new AuthorityElectionClosedError();
    }

    if (input.platformUserId) {
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
      if (input.platformUserId !== authority.platformUserId) {
        const siblings = await this.authorityRepository.findByElection(electionId);
        if (siblings.some((sibling) => sibling.platformUserId === input.platformUserId)) {
          throw new AuthorityAlreadyDesignatedError();
        }
      }
    }

    const replaceInput: ReplaceAuthorityInput = { ...input, updatedBy: actorId };
    let updated;
    try {
      updated = await this.authorityRepository.replace(authorityId, replaceInput);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new AuthorityAlreadyDesignatedError();
      }
      throw error;
    }
    const account = await this.platformUserRepository.findById(updated.platformUserId);

    return {
      id: updated.id,
      rolDescriptivo: updated.rolDescriptivo,
      platformUserEmail: account?.email ?? '(cuenta eliminada)',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
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
