import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { RateAlertDto } from '../types/audit.types';

export function rateAlertsKey(electionId: string) {
  return ['elections', electionId, 'rate-alerts'] as const;
}

export function useRateAlerts(electionId: string) {
  return useQuery({
    queryKey: rateAlertsKey(electionId),
    queryFn: () => api.get<RateAlertDto[]>(`/elections/${electionId}/rate-alerts`),
    enabled: electionId.length > 0,
  });
}
