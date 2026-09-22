import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { TallyDto } from '../types/tally.types';

// Conteo en vivo (CU-11): se refresca solo mientras la pestaña esta activa.
export const TALLY_REFETCH_MS = 5_000;

export function tallyKey(electionId: string) {
  return ['elections', electionId, 'votes', 'tally'] as const;
}

export function useTally(electionId: string) {
  return useQuery({
    queryKey: tallyKey(electionId),
    queryFn: () => api.get<TallyDto>(`/elections/${electionId}/votes/tally`),
    enabled: electionId.length > 0,
    refetchInterval: TALLY_REFETCH_MS,
  });
}
