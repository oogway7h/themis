import { Interface, type TransactionReceipt } from 'ethers';
import { newRootFromReceipt } from './semaphore-onchain.service';

const iface = new Interface([
  'event MembersAdded(uint256 indexed groupId, uint256 startIndex, uint256[] identityCommitments, uint256 merkleTreeRoot)',
  'event Unrelated(uint256 x)',
]);

function log(name: string, args: unknown[]) {
  const event = iface.getEvent(name)!;
  return iface.encodeEventLog(event, args);
}

function receipt(logs: { topics: string[]; data: string }[]): TransactionReceipt {
  return { hash: '0xabc', logs } as unknown as TransactionReceipt;
}

describe('newRootFromReceipt', () => {
  it('toma la raiz del evento MembersAdded del grupo, sin releer el contrato', () => {
    const r = receipt([
      log('Unrelated', [1n]),
      log('MembersAdded', [2n, 0n, [11n, 12n], 999n]),
      log('MembersAdded', [1n, 6n, [13n], 2940n]),
    ]);

    expect(newRootFromReceipt(r, 1n)).toBe(2940n);
  });

  it('falla si el recibo no trae MembersAdded de ese grupo', () => {
    const r = receipt([log('MembersAdded', [2n, 0n, [11n], 999n])]);

    expect(() => newRootFromReceipt(r, 1n)).toThrow(/MembersAdded/);
  });
});
