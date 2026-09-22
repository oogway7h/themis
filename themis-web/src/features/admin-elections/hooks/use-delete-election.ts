import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export function useDeleteElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/elections/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
  });
}
