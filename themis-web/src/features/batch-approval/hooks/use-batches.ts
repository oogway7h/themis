import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { BatchDto } from '../types/batch.types';

// Otras autoridades aprueban en paralelo: se refresca solo para que el progreso
// "X de N" no quede desactualizado. React Query lo pausa con la pestaña en segundo plano.
export const BATCHES_REFETCH_MS = 15_000;

export function batchesKey(electionId: string) {
  return ['elections', electionId, 'batches'] as const;
}

export function useBatches(electionId: string) {
  return useQuery({
    queryKey: batchesKey(electionId),
    queryFn: () => api.get<BatchDto[]>(`/elections/${electionId}/batches`),
    enabled: electionId.length > 0,
    refetchInterval: BATCHES_REFETCH_MS,
  });
}
