import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

/** Soft-delete: el backend desactiva la cuenta (isActive=false), no la borra. */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/auth/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
