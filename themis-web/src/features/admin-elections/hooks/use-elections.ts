import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ElectionDto, ListElectionsFilter } from '../types/election.types';

function buildQuery(filter: ListElectionsFilter): string {
  const params = new URLSearchParams();
  if (filter.nombre) {
    params.set('nombre', filter.nombre);
  }
  if (filter.estado) {
    params.set('estado', filter.estado);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useElections(filter: ListElectionsFilter = {}) {
  return useQuery({
    queryKey: ['elections', filter],
    queryFn: () => api.get<ElectionDto[]>(`/elections${buildQuery(filter)}`),
    placeholderData: keepPreviousData,
  });
}
