import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AuditResultDto } from '../types/audit.types';

export function auditResultKey(electionId: string) {
  return ['elections', electionId, 'audit', 'result'] as const;
}

export function useAuditResult(electionId: string) {
  return useQuery({
    queryKey: auditResultKey(electionId),
    queryFn: () => api.get<AuditResultDto>(`/elections/${electionId}/audit/result`),
    enabled: electionId.length > 0,
  });
}
