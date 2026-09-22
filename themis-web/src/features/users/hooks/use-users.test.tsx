import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useUsers } from './use-users';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { get: getMock },
}));

describe('useUsers', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('pide GET /auth/users con page/pageSize y devuelve la respuesta paginada', async () => {
    const response = {
      data: [
        {
          id: '1',
          email: 'admin@test.dev',
          nombreCompleto: 'Admin de Prueba',
          role: 'ADMIN' as const,
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    };
    getMock.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 10 }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith('/auth/users?page=1&pageSize=10');
    expect(result.current.data).toEqual(response);
  });
});
