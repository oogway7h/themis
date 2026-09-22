import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { BatchDetailDto } from '../types/batch.types';
import { batchDetailKey } from './use-batch-detail';
import { batchesKey } from './use-batches';

/**
 * Aprueba el lote con la cuenta autenticada. La respuesta ya trae el estado
 * actualizado (incluido INSERTED si esta fue la aprobacion que cruzo el umbral).
 */
export function useApproveBatch(electionId: string, batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<BatchDetailDto>(`/elections/${electionId}/batches/${batchId}/approvals`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchDetailKey(electionId, batchId) }),
        queryClient.invalidateQueries({ queryKey: batchesKey(electionId) }),
      ]);
    },
  });
}
