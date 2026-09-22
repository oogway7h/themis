import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { CreateUserRequest, PlatformUserDto } from '../types/user.types';
import type { CreateUserFormValues } from '../schemas/user-form.schema';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserFormValues) =>
      api.post<PlatformUserDto>('/auth/users', input satisfies CreateUserRequest),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
