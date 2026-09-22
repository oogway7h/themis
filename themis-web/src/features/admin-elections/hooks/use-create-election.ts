import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { CreateElectionRequest, ElectionDto } from '../types/election.types';

export function useCreateElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateElectionRequest) =>
      api.post<ElectionDto>('/elections', input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
  });
}
