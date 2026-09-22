import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { CheckpointPolicyDto } from '../types/checkpoint-policy.types';

export function useCheckpointPolicy(electionId: string) {
  return useQuery({
    queryKey: ['elections', electionId, 'checkpoint-policy'],
    queryFn: () => api.get<CheckpointPolicyDto>(`/elections/${electionId}/checkpoint-policy`),
    enabled: electionId.length > 0,
  });
}
