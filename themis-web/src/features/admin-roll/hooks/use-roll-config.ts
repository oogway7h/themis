import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { RollConfigDto } from '../types/roll-config.types';

export function useRollConfig(electionId: string) {
  return useQuery({
    queryKey: ['elections', electionId, 'roll-config'],
    queryFn: () => api.get<RollConfigDto>(`/elections/${electionId}/roll-config`),
    enabled: electionId.length > 0,
  });
}
