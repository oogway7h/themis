import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useApproveBatch } from './use-approve-batch';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { post: postMock },
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

describe('useApproveBatch', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper(queryClient: QueryClient) {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('aprueba el lote y luego invalida el detalle y la lista de lotes', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    postMock.mockResolvedValueOnce({ id: 'b1', status: 'PENDING_APPROVAL' });

    const { result } = renderHook(() => useApproveBatch('e1', 'b1'), {
      wrapper: wrapper(queryClient),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postMock).toHaveBeenCalledWith('/elections/e1/batches/b1/approvals');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['elections', 'e1', 'batches', 'b1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['elections', 'e1', 'batches'] });
  });

  it('no invalida nada si el backend rechaza la aprobacion', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    postMock.mockRejectedValueOnce(new Error('409'));

    const { result } = renderHook(() => useApproveBatch('e1', 'b1'), {
      wrapper: wrapper(queryClient),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
