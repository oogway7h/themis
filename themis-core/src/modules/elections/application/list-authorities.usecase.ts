import { Inject, Injectable } from '@nestjs/common';
import { AUTHORITY_REPOSITORY, AuthorityRepository } from '../domain/authority.repository';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../../auth/domain/platform-user.repository';

export interface AuthorityWithEmail {
  id: string;
  rolDescriptivo: string;
  platformUserEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ListAuthoritiesUseCase {
  constructor(
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly platformUserRepository: PlatformUserRepository,
  ) {}

  async execute(electionId: string): Promise<AuthorityWithEmail[]> {
    const authorities = await this.authorityRepository.findByElection(electionId);
    const results: AuthorityWithEmail[] = [];

    for (const authority of authorities) {
      const account = await this.platformUserRepository.findById(authority.platformUserId);
      results.push({
        id: authority.id,
        rolDescriptivo: authority.rolDescriptivo,
        platformUserEmail: account?.email ?? '(cuenta eliminada)',
        createdAt: authority.createdAt,
        updatedAt: authority.updatedAt,
      });
    }

    return results;
  }
}
