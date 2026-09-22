import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useTally } from './use-tally';

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

describe('useTally', () => {
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

  it('pide el conteo en vivo del endpoint publico de la eleccion', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    getMock.mockResolvedValueOnce({
      electionId: 'e1',
      estado: 'VOTACION_ABIERTA',
      totalVotes: 3,
      opciones: [{ optionId: 'o1', nombre: 'A', voteCount: 3 }],
      asOf: '2026-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useTally('e1'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith('/elections/e1/votes/tally');
    expect(result.current.data?.totalVotes).toBe(3);
  });

  it('no dispara la query si electionId esta vacio', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useTally(''), { wrapper: wrapper(queryClient) });

    expect(getMock).not.toHaveBeenCalled();
  });
});
