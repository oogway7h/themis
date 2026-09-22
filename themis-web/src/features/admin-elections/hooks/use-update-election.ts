import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ElectionDto, UpdateElectionRequest } from '../types/election.types';

export function useUpdateElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateElectionRequest }) =>
      api.patch<ElectionDto>(`/elections/${id}`, values),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['elections'] }),
        queryClient.invalidateQueries({ queryKey: ['elections', variables.id] }),
      ]);
    },
  });
}
