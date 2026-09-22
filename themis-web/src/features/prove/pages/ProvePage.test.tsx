import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProvePage } from './ProvePage';

const { groupCtorMock, identityImportMock, generateProofMock } = vi.hoisted(() => ({
  groupCtorMock: vi.fn(),
  identityImportMock: vi.fn(),
  generateProofMock: vi.fn(),
}));

vi.mock('@semaphore-protocol/group', () => ({
  Group: class {
    members: bigint[];
    constructor(members: bigint[]) {
      groupCtorMock(members);
      this.members = members;
    }
  },
}));

vi.mock('@semaphore-protocol/identity', () => ({
  Identity: { import: (key: string) => identityImportMock(key) },
}));

vi.mock('@semaphore-protocol/proof', () => ({
  generateProof: (...args: unknown[]) => generateProofMock(...args),
}));

describe('ProvePage', () => {
  beforeEach(() => {
    groupCtorMock.mockReset();
    identityImportMock.mockReset();
    generateProofMock.mockReset();
    delete window.ThemisVoteChannel;
    delete window.generateVoteProof;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('expone window.generateVoteProof al montar', () => {
    render(<ProvePage />);
    expect(typeof window.generateVoteProof).toBe('function');
  });

  it('sin ThemisVoteChannel (navegador normal), avisa que solo funciona en la app', async () => {
    vi.useFakeTimers();
    render(<ProvePage />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(/solo funciona dentro de la app themis/i)).toBeInTheDocument();
  });

  it('con ThemisVoteChannel presente, genera la prueba y postea el resultado', async () => {
    const postMessage = vi.fn();
    window.ThemisVoteChannel = { postMessage };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        electionId: 'e1',
        onChainGroupId: '7',
        members: ['1', '2'],
        options: [{ id: 'opt-1', onChainIndex: 0 }],
      }),
    } as Response);
    identityImportMock.mockReturnValue({ commitment: 1n });
    generateProofMock.mockResolvedValue({
      merkleTreeDepth: 1,
      merkleTreeRoot: '111',
      nullifier: 'n1',
      message: '0',
      scope: '7',
      points: ['1', '2', '3', '4', '5', '6', '7', '8'],
    });

    render(<ProvePage />);

    await window.generateVoteProof?.(
      JSON.stringify({
        identityPrivateKey: 'priv',
        electionId: 'e1',
        optionId: 'opt-1',
        apiBaseUrl: 'http://api',
      }),
    );

    expect(fetch).toHaveBeenCalledWith('http://api/elections/e1/voting-context');
    expect(groupCtorMock).toHaveBeenCalledWith([1n, 2n]);
    expect(generateProofMock).toHaveBeenCalledWith(
      { commitment: 1n },
      expect.objectContaining({ members: [1n, 2n] }),
      0n,
      7n,
    );
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'vote-proof',
        ok: true,
        proof: {
          merkleTreeDepth: 1,
          merkleTreeRoot: '111',
          nullifier: 'n1',
          message: '0',
          scope: '7',
          points: ['1', '2', '3', '4', '5', '6', '7', '8'],
        },
      }),
    );
  });

  it('si la opcion elegida no esta en el contexto, postea error sin llamar generateProof', async () => {
    const postMessage = vi.fn();
    window.ThemisVoteChannel = { postMessage };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        electionId: 'e1',
        onChainGroupId: '7',
        members: ['1'],
        options: [{ id: 'opt-1', onChainIndex: 0 }],
      }),
    } as Response);

    render(<ProvePage />);

    await window.generateVoteProof?.(
      JSON.stringify({
        identityPrivateKey: 'priv',
        electionId: 'e1',
        optionId: 'opt-no-existe',
        apiBaseUrl: 'http://api',
      }),
    );

    expect(generateProofMock).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"ok":false'),
    );
  });
});
