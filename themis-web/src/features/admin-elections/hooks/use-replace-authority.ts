import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AuthorityDto, ReplaceAuthorityInput } from '../types/authority.types';

export function useReplaceAuthority(electionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      authorityId,
      values,
    }: {
      authorityId: string;
      values: ReplaceAuthorityInput;
    }) => api.patch<AuthorityDto>(`/elections/${electionId}/authorities/${authorityId}`, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['elections', electionId, 'authorities'],
      });
    },
  });
}
