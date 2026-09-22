import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type {
  ForecastResponse,
  HealthResponse,
  PingListResponse,
} from '@/api/types';

export const demoKeys = {
  health: ['health'] as const,
  pings: ['pings'] as const,
  forecast: ['forecast'] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: demoKeys.health,
    queryFn: () => api.get<HealthResponse>('/health'),
    refetchInterval: 10_000,
  });
}

export function usePings() {
  return useQuery({
    queryKey: demoKeys.pings,
    queryFn: () => api.get<PingListResponse>('/demo/pings?limit=10'),
  });
}

export function useForecast() {
  return useQuery({
    queryKey: demoKeys.forecast,
    queryFn: () => api.get<ForecastResponse>('/demo/forecast?horizon=5'),
  });
}

export function useCreatePing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: string) =>
      api.post('/demo/pings', { source: 'themis-web', note }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: demoKeys.pings }),
        queryClient.invalidateQueries({ queryKey: demoKeys.forecast }),
      ]);
    },
  });
}

export function useChainPing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ txHash: string }>('/demo/chain/ping'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: demoKeys.health });
    },
  });
}
