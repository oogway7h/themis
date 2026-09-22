import { Inject, Injectable } from '@nestjs/common';
import {
  PLATFORM_USER_REPOSITORY,
  PlatformUserRepository,
} from '../domain/platform-user.repository';
import { PlatformUser, PlatformRole } from '../domain/platform-user.entity';

export interface ListPlatformUsersInput {
  page: number;
  pageSize: number;
  email?: string;
  role?: PlatformRole;
}

export interface ListPlatformUsersOutput {
  data: PlatformUser[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ListPlatformUsersUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY)
    private readonly repository: PlatformUserRepository,
  ) {}

  async execute(input: ListPlatformUsersInput): Promise<ListPlatformUsersOutput> {
    const { items, total } = await this.repository.findAllActive({
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      email: input.email,
      role: input.role,
    });

    return { data: items, total, page: input.page, pageSize: input.pageSize };
  }
}
