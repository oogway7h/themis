import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '../lib/auth-context';
import { useLogin } from './use-login';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { post: postMock },
}));

describe('useLogin', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper(loginSpy: AuthContextValue['login']) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const value: AuthContextValue = {
      status: 'anonymous',
      session: null,
      getSession: () => null,
      login: loginSpy,
      logout: async () => {},
    };

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  it('en exito llama a login(...) del contexto con la respuesta (AC-01)', async () => {
    const response = {
      role: 'ADMIN' as const,
      nombreCompleto: 'Admin de Prueba',
    };
    postMock.mockResolvedValueOnce(response);
    const loginSpy = vi.fn();

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(loginSpy) });

    act(() => {
      result.current.mutate({ email: 'admin@test.dev', password: '123123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(loginSpy).toHaveBeenCalledWith(response);
  });

  it('en fallo no llama a login(...) del contexto (AC-02)', async () => {
    postMock.mockRejectedValueOnce(new Error('401'));
    const loginSpy = vi.fn();

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(loginSpy) });

    act(() => {
      result.current.mutate({ email: 'admin@test.dev', password: 'mala' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(loginSpy).not.toHaveBeenCalled();
  });
});
