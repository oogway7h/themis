import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { PlatformUserSearchResponse } from '../types/authority.types';

/**
 * Lista completa de cuentas de plataforma con un rol dado, vía
 * GET /auth/users (extendido a ADMIN en UT-CORE-HU03-07). Alimenta el
 * Combobox (Popover + Command de shadcn/ui) de PlatformUserCombobox — el
 * filtrado por email lo hace el propio Command, del lado del cliente.
 */
export function usePlatformUsersByRole(role = 'AUTORIDAD_REGISTRO') {
  return useQuery({
    queryKey: ['platform-users', 'by-role', role],
    queryFn: () =>
      api.get<PlatformUserSearchResponse>(`/auth/users?role=${role}&pageSize=100`),
  });
}
