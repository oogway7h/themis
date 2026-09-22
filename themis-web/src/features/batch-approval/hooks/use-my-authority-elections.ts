import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ElectionDto } from '@/features/admin-elections/types/election.types';

/** Elecciones donde la cuenta autenticada (AUTORIDAD_REGISTRO) esta designada. */
export function useMyAuthorityElections() {
  return useQuery({
    queryKey: ['authority', 'elections'],
    queryFn: () => api.get<ElectionDto[]>('/elections/mine/authority'),
  });
}
