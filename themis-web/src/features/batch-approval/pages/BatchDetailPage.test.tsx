import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchDetailPage } from './BatchDetailPage';

const { getMock, postMock, sessionRef } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  sessionRef: { current: { role: 'AUTORIDAD_REGISTRO', nombreCompleto: 'Autoridad 1' } as {
    role: string;
    nombreCompleto: string;
  } | null },
}));

vi.mock('@/api/client', () => ({
  api: { get: getMock, post: postMock },
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

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ session: sessionRef.current }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return { ...actual, useNavigate: () => vi.fn() };
});

const baseBatch = {
  id: 'b1',
  status: 'PENDING_APPROVAL',
  credentialCount: 3,
  approvalsRequired: 3,
  approvalCount: 1,
  yaAprobado: false,
  closedAt: '2026-09-19T20:00:00.000Z',
  insertedAt: null,
  merkleRootAfter: null,
  onChainTxHash: null,
  failureReason: null,
  approvals: [
    { authorityId: 'a1', rolDescriptivo: 'Autoridad 1', approvedAt: '2026-09-19T20:05:00.000Z' },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BatchDetailPage electionId="e1" batchId="b1" />
    </QueryClientProvider>,
  );
}

describe('BatchDetailPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    sessionRef.current = { role: 'AUTORIDAD_REGISTRO', nombreCompleto: 'Autoridad 1' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el progreso X de N y deja aprobar a una autoridad que aun no aprobo', async () => {
    getMock.mockResolvedValue(baseBatch);

    renderPage();

    expect(await screen.findByText('1 de 3 aprobaciones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar lote' })).toBeEnabled();
  });

  it('pide confirmacion y luego envia la aprobacion', async () => {
    getMock.mockResolvedValue(baseBatch);
    postMock.mockResolvedValue({ ...baseBatch, approvalCount: 2, yaAprobado: true });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Aprobar lote' }));
    await user.click(await screen.findByRole('button', { name: 'Aprobar' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/elections/e1/batches/b1/approvals'),
    );
  });

  it('deshabilita el boton si la autoridad ya aprobo', async () => {
    getMock.mockResolvedValue({ ...baseBatch, yaAprobado: true });

    renderPage();

    expect(await screen.findByRole('button', { name: 'Aprobar lote' })).toBeDisabled();
    expect(screen.getByText('Ya aprobaste este lote.')).toBeInTheDocument();
  });

  it('deshabilita el boton si el lote ya no esta pendiente y muestra tx y raiz cuando esta insertado', async () => {
    getMock.mockResolvedValue({
      ...baseBatch,
      status: 'INSERTED',
      approvalCount: 3,
      insertedAt: '2026-09-19T20:10:00.000Z',
      onChainTxHash: '0xabc123',
      merkleRootAfter: '987654321',
    });

    renderPage();

    expect(await screen.findByText('0xabc123')).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar lote' })).toBeDisabled();
    expect(screen.getByText('El lote ya no está pendiente de aprobación.')).toBeInTheDocument();
  });

  it('no muestra el boton de aprobar a un ADMIN (solo lectura)', async () => {
    sessionRef.current = { role: 'ADMIN', nombreCompleto: 'Admin' };
    getMock.mockResolvedValue(baseBatch);

    renderPage();

    expect(await screen.findByText('1 de 3 aprobaciones')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar lote' })).not.toBeInTheDocument();
  });

  it('en INSERTION_FAILED avisa del reintento y no expone el error tecnico crudo', async () => {
    getMock.mockResolvedValue({
      ...baseBatch,
      status: 'INSERTION_FAILED',
      approvalCount: 3,
      failureReason: 'nonce has already been used (transaction="0x02f9...")',
    });

    renderPage();

    expect(await screen.findByText(/el sistema la reintentará automáticamente/)).toBeInTheDocument();
    expect(screen.queryByText(/nonce has already been used/)).not.toBeInTheDocument();
  });

  it('muestra el mensaje segun el code cuando el backend rechaza la aprobacion', async () => {
    const { ApiError } = await import('@/api/client');
    getMock.mockResolvedValue(baseBatch);
    postMock.mockRejectedValue(
      new ApiError('El servidor respondio 409', 409, 'BATCH_NOT_PENDING_APPROVAL'),
    );
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Aprobar lote' }));
    await user.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El lote ya no está pendiente de aprobación.',
    );
  });
});
