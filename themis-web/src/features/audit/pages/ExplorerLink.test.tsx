import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExplorerLink } from './AuditElectionDetailPage';

const HASH = '0x' + 'ab'.repeat(32);

describe('ExplorerLink', () => {
  it('apunta a la tx en el explorador cuando hay red real', () => {
    render(<ExplorerLink base="https://sepolia.basescan.org" path="tx" hash={HASH} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', `https://sepolia.basescan.org/tx/${HASH}`);
  });

  it('sin explorador (Hardhat local) muestra el hash sin link', () => {
    render(<ExplorerLink base={null} path="tx" hash={HASH} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
