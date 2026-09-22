import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AuthorityDto } from '../types/authority.types';

export function useAuthorities(electionId: string) {
  return useQuery({
    queryKey: ['elections', electionId, 'authorities'],
    queryFn: () => api.get<AuthorityDto[]>(`/elections/${electionId}/authorities`),
    enabled: electionId.length > 0,
  });
}
