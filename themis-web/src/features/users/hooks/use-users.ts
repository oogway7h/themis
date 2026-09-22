import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { PaginatedUsersResponse } from '../types/user.types';

export interface UseUsersParams {
  /** 1-based, igual que el query param de GET /auth/users. */
  page: number;
  pageSize: number;
}

export function useUsers({ page, pageSize }: UseUsersParams) {
  return useQuery({
    queryKey: ['users', page, pageSize],
    queryFn: () =>
      api.get<PaginatedUsersResponse>(
        `/auth/users?page=${page}&pageSize=${pageSize}`,
      ),
    // Mantiene la pagina anterior visible mientras carga la siguiente, en vez
    // de parpadear a un loading state al cambiar de pagina.
    placeholderData: keepPreviousData,
  });
}
