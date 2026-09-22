import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useCreateUser } from './use-create-user';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { post: postMock },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  },
}));

describe('useCreateUser', () => {
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

  it('crea la cuenta y luego invalida la query de usuarios', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    postMock.mockResolvedValueOnce({
      id: '1',
      email: 'nueva@test.dev',
      nombreCompleto: 'Nueva Cuenta',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: wrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        email: 'nueva@test.dev',
        password: 'unaClaveSegura123',
        nombreCompleto: 'Nueva Cuenta',
        role: 'ADMIN',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postMock).toHaveBeenCalledWith('/auth/users', {
      email: 'nueva@test.dev',
      password: 'unaClaveSegura123',
      nombreCompleto: 'Nueva Cuenta',
      role: 'ADMIN',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });
});
