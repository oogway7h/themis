import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from './UsersPage';

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  api: { get: getMock, post: postMock, patch: patchMock, delete: deleteMock },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  },
}));

// vaul (Drawer) mide el contenido con ResizeObserver y usa Pointer Events
// (setPointerCapture) para el drag del sheet -- jsdom no implementa ninguno
// de los dos, así que sin estos stubs el render/interacción explota.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

const onePage = {
  data: [
    {
      id: '1',
      email: 'admin@test.dev',
      nombreCompleto: 'Admin de Prueba',
      role: 'ADMIN' as const,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      email: 'auditor@test.dev',
      nombreCompleto: 'Auditor de Prueba',
      role: 'AUDITOR' as const,
      isActive: true,
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('muestra titulo, subtitulo y las filas devueltas por GET /auth/users', async () => {
    getMock.mockResolvedValueOnce(onePage);

    renderPage();

    expect(screen.getByRole('heading', { name: 'Gestionar Usuarios' })).toBeInTheDocument();
    expect(
      screen.getByText(/Administradores, autoridades de registro y auditores/),
    ).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Admin de Prueba')).toBeInTheDocument());
    expect(screen.getByText('auditor@test.dev')).toBeInTheDocument();
    expect(screen.getByText('Auditor')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/auth/users?page=1&pageSize=10');
  });

  it('crear: el boton Crear abre el drawer y al enviar llama a POST /auth/users', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(onePage);
    postMock.mockResolvedValueOnce({
      id: '3',
      email: 'nueva@test.dev',
      nombreCompleto: 'Nueva Cuenta',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-03T00:00:00.000Z',
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Admin de Prueba')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /crear/i }));

    expect(await screen.findByRole('heading', { name: 'Nueva cuenta' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nombre completo'), 'Nueva Cuenta');
    await user.type(screen.getByLabelText('Email'), 'nueva@test.dev');
    await user.type(screen.getByLabelText('Contrasena'), 'unaClaveSegura123');
    await user.selectOptions(screen.getByLabelText('Rol'), 'ADMIN');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/users', {
        email: 'nueva@test.dev',
        password: 'unaClaveSegura123',
        nombreCompleto: 'Nueva Cuenta',
        role: 'ADMIN',
      }),
    );
  });

  it('editar: precarga nombre/rol de la fila y llama a PATCH al guardar', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(onePage);
    patchMock.mockResolvedValueOnce({
      ...onePage.data[0],
      nombreCompleto: 'Admin Editado',
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Admin de Prueba')).toBeInTheDocument());

    const row = screen.getByText('Admin de Prueba').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Editar' }));

    const nombreInput = await screen.findByLabelText('Nombre completo');
    expect(nombreInput).toHaveValue('Admin de Prueba');

    await user.clear(nombreInput);
    await user.type(nombreInput, 'Admin Editado');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith('/auth/users/1', {
        nombreCompleto: 'Admin Editado',
        role: 'ADMIN',
      }),
    );
  });

  it('eliminar: pide confirmacion y llama a DELETE (soft-delete) al confirmar', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(onePage);
    deleteMock.mockResolvedValueOnce({ ok: true });

    renderPage();
    await waitFor(() => expect(screen.getByText('Admin de Prueba')).toBeInTheDocument());

    const row = screen.getByText('Admin de Prueba').closest('tr');
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Eliminar' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Admin de Prueba/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^Eliminar$/ }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('/auth/users/1'));
  });
});
