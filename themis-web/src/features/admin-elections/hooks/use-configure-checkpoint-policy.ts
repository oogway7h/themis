import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type {
  CheckpointPolicyDto,
  ConfigureCheckpointPolicyRequest,
} from '../types/checkpoint-policy.types';

export function useConfigureCheckpointPolicy(electionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfigureCheckpointPolicyRequest) =>
      api.put<CheckpointPolicyDto>(`/elections/${electionId}/checkpoint-policy`, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['elections', electionId, 'checkpoint-policy'],
      });
    },
  });
}
