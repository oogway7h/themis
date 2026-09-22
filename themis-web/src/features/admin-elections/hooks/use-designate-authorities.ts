import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AuthorityDto, DesignateAuthorityInput } from '../types/authority.types';

export function useDesignateAuthorities(electionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (autoridades: DesignateAuthorityInput[]) =>
      api.post<AuthorityDto[]>(`/elections/${electionId}/authorities`, { autoridades }),
    // await, no void: la mutación queda "pending" hasta que el refetch
    // invalidado termine, para que la UI no vuelva a mostrar el estado viejo
    // por un instante entre que el POST resuelve y llega el dato fresco.
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['elections', electionId, 'authorities'],
      });
    },
  });
}
