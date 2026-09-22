import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useUpdateUser } from './use-update-user';

const { patchMock } = vi.hoisted(() => ({ patchMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { patch: patchMock },
}));

describe('useUpdateUser', () => {
  beforeEach(() => {
    patchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper(queryClient: QueryClient) {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('llama PATCH /auth/users/:id y luego invalida la query de usuarios', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    patchMock.mockResolvedValueOnce({
      id: '1',
      email: 'editar@test.dev',
      nombreCompleto: 'Nombre Editado',
      role: 'AUDITOR',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: wrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        id: '1',
        values: { nombreCompleto: 'Nombre Editado', role: 'AUDITOR' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchMock).toHaveBeenCalledWith('/auth/users/1', {
      nombreCompleto: 'Nombre Editado',
      role: 'AUDITOR',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });
});
