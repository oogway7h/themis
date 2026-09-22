import { PlatformUser } from '../../src/modules/auth/domain/platform-user.entity';
import {
  CreatePlatformUserInput,
  FindAllActiveParams,
  FindAllActiveResult,
  PlatformUserRepository,
  UpdatePlatformUserInput,
} from '../../src/modules/auth/domain/platform-user.repository';

export class InMemoryPlatformUserRepository implements PlatformUserRepository {
  private readonly users = new Map<string, PlatformUser>();
  private sequence = 0;

  async findByEmail(email: string): Promise<PlatformUser | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<PlatformUser | null> {
    return this.users.get(id) ?? null;
  }

  async create(input: CreatePlatformUserInput): Promise<PlatformUser> {
    this.sequence += 1;
    const user = new PlatformUser(
      `test-id-${this.sequence}`,
      input.email,
      input.passwordHash,
      input.nombreCompleto,
      input.role,
      true,
      new Date(),
    );
    this.users.set(user.id, user);
    return user;
  }

  async findAllActive(params: FindAllActiveParams): Promise<FindAllActiveResult> {
    const active = [...this.users.values()]
      .filter((user) => user.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      items: active.slice(params.skip, params.skip + params.take),
      total: active.length,
    };
  }

  async update(
    id: string,
    input: UpdatePlatformUserInput,
  ): Promise<PlatformUser | null> {
    const existing = this.users.get(id);
    if (!existing) {
      return null;
    }

    const updated = new PlatformUser(
      existing.id,
      existing.email,
      existing.passwordHash,
      input.nombreCompleto,
      input.role,
      existing.isActive,
      existing.createdAt,
    );
    this.users.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<PlatformUser | null> {
    const existing = this.users.get(id);
    if (!existing) {
      return null;
    }

    const deactivated = new PlatformUser(
      existing.id,
      existing.email,
      existing.passwordHash,
      existing.nombreCompleto,
      existing.role,
      false,
      existing.createdAt,
    );
    this.users.set(id, deactivated);
    return deactivated;
  }
}
