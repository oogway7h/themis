import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ElectionDto } from '../types/election.types';

export function useElection(electionId: string) {
  return useQuery({
    queryKey: ['elections', electionId],
    queryFn: () => api.get<ElectionDto>(`/elections/${electionId}`),
    enabled: electionId.length > 0,
  });
}
