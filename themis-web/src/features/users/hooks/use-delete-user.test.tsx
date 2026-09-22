import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useDeleteUser } from './use-delete-user';

const { deleteMock } = vi.hoisted(() => ({ deleteMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { delete: deleteMock },
}));

describe('useDeleteUser', () => {
  beforeEach(() => {
    deleteMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper(queryClient: QueryClient) {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('llama DELETE /auth/users/:id (soft-delete) y luego invalida la query de usuarios', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    deleteMock.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: wrapper(queryClient),
    });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deleteMock).toHaveBeenCalledWith('/auth/users/1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });
});
