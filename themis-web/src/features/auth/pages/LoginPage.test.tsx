import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../lib/auth-context';
import { LoginPage } from './LoginPage';

const { postMock, getMock, MockApiError } = vi.hoisted(() => {
  class HoistedMockApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }

  return {
    postMock: vi.fn(),
    getMock: vi.fn(),
    MockApiError: HoistedMockApiError,
  };
});

vi.mock('@/api/client', () => ({
  api: { post: postMock, get: getMock },
  ApiError: MockApiError,
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    // AuthProvider hace GET /auth/me al montar; sin sesion previa (no hay
    // cookie en el entorno de test), responde 401.
    getMock.mockRejectedValue(new MockApiError('no session', 401));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envia el formulario y llama a la API de login (AC-01)', async () => {
    postMock.mockResolvedValueOnce({
      role: 'ADMIN',
      nombreCompleto: 'Admin de Prueba',
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'admin@themis.dev');
    await user.type(screen.getByLabelText('Contrasena'), '123123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@themis.dev',
        password: '123123',
      }),
    );
  });

  it('muestra un mensaje de error generico si el login falla, sin distinguir el campo (AC-02)', async () => {
    postMock.mockRejectedValueOnce(new MockApiError('invalid', 401));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'admin@themis.dev');
    await user.type(screen.getByLabelText('Contrasena'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(
      await screen.findByText('Credenciales invalidas. Verifica tu email y contrasena.'),
    ).toBeInTheDocument();
  });

  it('valida el formulario con zod antes de llamar a la API (email vacio)', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Contrasena'), '123123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Ingresa un email valido')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });
});
