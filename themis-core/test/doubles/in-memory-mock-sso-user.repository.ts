import { MockSsoUser } from '../../src/modules/mock-sso/domain/mock-sso-user.entity';
import {
  CreateMockSsoUserInput,
  MockSsoUserRepository,
} from '../../src/modules/mock-sso/domain/mock-sso-user.repository';

export class InMemoryMockSsoUserRepository implements MockSsoUserRepository {
  private readonly users = new Map<string, MockSsoUser>();
  private sequence = 0;

  async findByCodigoInstitucional(codigo: string): Promise<MockSsoUser | null> {
    for (const user of this.users.values()) {
      if (user.codigoInstitucional === codigo) {
        return user;
      }
    }
    return null;
  }

  async create(input: CreateMockSsoUserInput): Promise<MockSsoUser> {
    this.sequence += 1;
    const user = new MockSsoUser(
      `test-id-${this.sequence}`,
      input.codigoInstitucional,
      input.passwordHash,
      input.nombreCompleto,
      input.facultad,
      input.carrera,
      input.tipoUsuario,
      input.estadoAcademico,
      new Date(),
    );
    this.users.set(user.id, user);
    return user;
  }

  async list(): Promise<MockSsoUser[]> {
    return Array.from(this.users.values());
  }
}
