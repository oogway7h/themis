import { Authority } from '../../src/modules/elections/domain/authority.entity';
import type {
  AuthorityRepository,
  DesignateAuthorityInput,
  ReplaceAuthorityInput,
} from '../../src/modules/elections/domain/authority.repository';

export class InMemoryAuthorityRepository implements AuthorityRepository {
  private readonly authorities = new Map<string, Authority>();
  private sequence = 0;

  async designateAll(
    electionId: string,
    inputs: DesignateAuthorityInput[],
    createdBy: string,
  ): Promise<Authority[]> {
    for (const input of inputs) {
      const duplicate = [...this.authorities.values()].some(
        (authority) =>
          authority.electionId === electionId &&
          authority.platformUserId === input.platformUserId,
      );
      if (duplicate) {
        const error = new Error('Unique constraint failed') as Error & { code?: string };
        error.code = 'P2002';
        throw error;
      }
    }

    const created: Authority[] = [];
    for (const input of inputs) {
      this.sequence += 1;
      const authority = new Authority(
        `authority-${this.sequence}`,
        electionId,
        input.platformUserId,
        input.rolDescriptivo,
        new Date(),
        createdBy,
        new Date(),
        createdBy,
      );
      this.authorities.set(authority.id, authority);
      created.push(authority);
    }
    return created;
  }

  async replace(authorityId: string, input: ReplaceAuthorityInput): Promise<Authority> {
    const existing = this.authorities.get(authorityId);
    if (!existing) {
      throw new Error(`Authority ${authorityId} no existe en el repositorio de prueba`);
    }

    const updated = new Authority(
      existing.id,
      existing.electionId,
      input.platformUserId ?? existing.platformUserId,
      input.rolDescriptivo ?? existing.rolDescriptivo,
      existing.createdAt,
      existing.createdBy,
      new Date(),
      input.updatedBy,
    );
    this.authorities.set(authorityId, updated);
    return updated;
  }

  async findByElection(electionId: string): Promise<Authority[]> {
    return [...this.authorities.values()].filter(
      (authority) => authority.electionId === electionId,
    );
  }

  async findById(authorityId: string): Promise<Authority | null> {
    return this.authorities.get(authorityId) ?? null;
  }

  async findByPlatformUser(platformUserId: string): Promise<Authority[]> {
    return [...this.authorities.values()].filter(
      (authority) => authority.platformUserId === platformUserId,
    );
  }
}
