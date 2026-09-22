import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { BatchDetailDto } from '../types/batch.types';
import { BATCHES_REFETCH_MS, batchesKey } from './use-batches';

export function batchDetailKey(electionId: string, batchId: string) {
  return [...batchesKey(electionId), batchId] as const;
}

export function useBatchDetail(electionId: string, batchId: string) {
  return useQuery({
    queryKey: batchDetailKey(electionId, batchId),
    queryFn: () =>
      api.get<BatchDetailDto>(`/elections/${electionId}/batches/${batchId}`),
    enabled: electionId.length > 0 && batchId.length > 0,
    // INSERTED es terminal: no hay nada mas que esperar.
    refetchInterval: (query) =>
      query.state.data?.status === 'INSERTED' ? false : BATCHES_REFETCH_MS,
  });
}
