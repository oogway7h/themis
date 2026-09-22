import { useMutation } from '@tanstack/react-query';
import { useSession } from './use-session';

export function useLogout() {
  const { logout } = useSession();
  return useMutation({ mutationFn: logout });
}
