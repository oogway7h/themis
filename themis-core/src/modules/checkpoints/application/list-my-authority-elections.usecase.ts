import { Inject, Injectable } from '@nestjs/common';
import {
  AUTHORITY_REPOSITORY,
  AuthorityRepository,
} from '../../elections/domain/authority.repository';
import {
  ELECTION_REPOSITORY,
  ElectionRepository,
} from '../../elections/domain/election.repository';
import { Election } from '../../elections/domain/election.entity';

/**
 * CU-08 (descubrimiento): en que elecciones esta designada esta cuenta
 * AUTORIDAD_REGISTRO. GET /elections/:id/authorities es ADMIN-only, asi que
 * esta es la unica forma en que una autoridad encuentra sus elecciones desde
 * themis-web.
 */
@Injectable()
export class ListMyAuthorityElectionsUseCase {
  constructor(
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
  ) {}

  async execute(platformUserId: string): Promise<Election[]> {
    const authorities = await this.authorityRepository.findByPlatformUser(platformUserId);
    const elections = await Promise.all(
      authorities.map((authority) => this.electionRepository.findById(authority.electionId)),
    );
    return elections.filter((election): election is Election => election !== null);
  }
}
