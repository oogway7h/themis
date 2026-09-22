import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ConfigureRollRequest, RollConfigDto } from '../types/roll-config.types';

export function useConfigureRoll(electionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfigureRollRequest) =>
      api.put<RollConfigDto>(`/elections/${electionId}/roll-config`, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['elections', electionId, 'roll-config'] }),
        queryClient.invalidateQueries({ queryKey: ['elections', electionId] }),
      ]);
    },
  });
}
