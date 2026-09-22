import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { PlatformUserDto, UpdateUserRequest } from '../types/user.types';
import type { UpdateUserFormValues } from '../schemas/user-form.schema';

export interface UpdateUserInput {
  id: string;
  values: UpdateUserFormValues;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: UpdateUserInput) =>
      api.patch<PlatformUserDto>(
        `/auth/users/${id}`,
        values satisfies UpdateUserRequest,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
