import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { LoginResponse } from '../types/auth.types';
import type { LoginFormValues } from '../schemas/login.schema';
import { useSession } from './use-session';

export function useLogin() {
  const { login } = useSession();

  return useMutation({
    mutationFn: (input: LoginFormValues) =>
      api.post<LoginResponse>('/auth/login', input),
    onSuccess: (response) => {
      login(response);
    },
  });
}
