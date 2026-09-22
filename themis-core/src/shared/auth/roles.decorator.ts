import { SetMetadata } from '@nestjs/common';
import { PlatformRole } from '../../modules/auth/domain/platform-user.entity';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: PlatformRole[]) => SetMetadata(ROLES_KEY, roles);
