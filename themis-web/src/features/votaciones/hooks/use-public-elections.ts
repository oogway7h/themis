import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { PublicElectionDto, PublicElectionStatus } from '../types/tally.types';

export function publicElectionsKey(estado?: PublicElectionStatus) {
  return ['elections', 'public', estado ?? 'all'] as const;
}

export function usePublicElections(estado?: PublicElectionStatus) {
  return useQuery({
    queryKey: publicElectionsKey(estado),
    queryFn: () =>
      api.get<PublicElectionDto[]>(
        `/elections/public${estado ? `?estado=${estado}` : ''}`,
      ),
  });
}

export function usePublicElection(electionId: string) {
  return useQuery({
    queryKey: ['elections', 'public', electionId] as const,
    queryFn: () => api.get<PublicElectionDto>(`/elections/public/${electionId}`),
    enabled: electionId.length > 0,
  });
}
