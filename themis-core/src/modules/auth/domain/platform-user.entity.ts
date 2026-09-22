export type PlatformRole =
  | 'ADMIN'
  | 'AUTORIDAD_REGISTRO'
  | 'AUDITOR'
  | 'SUPERUSUARIO';

export class PlatformUser {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly nombreCompleto: string,
    public readonly role: PlatformRole,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
  ) {}
}
