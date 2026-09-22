import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useAuditResult } from './use-audit-result';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { get: getMock },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string,
    ) {
      super(message);
    }
  },
}));

describe('useAuditResult', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper(queryClient: QueryClient) {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('pide la vista de auditoria de la eleccion', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getMock.mockResolvedValueOnce({
      electionId: 'e1',
      estado: 'CERRADA',
      result: { totalVotes: 5, finalMerkleRoot: 'r', sourceBlockNumber: 10, computedAt: '2026-01-01T00:00:00Z' },
      liveTally: [],
      chainSync: { lastSyncedBlock: 10, updatedAt: '2026-01-01T00:00:00Z' },
      voteSubmissionCounts: { total: 5, relay: 4, chainSync: 1 },
    });

    const { result } = renderHook(() => useAuditResult('e1'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith('/elections/e1/audit/result');
    expect(result.current.data?.result?.totalVotes).toBe(5);
  });
});
