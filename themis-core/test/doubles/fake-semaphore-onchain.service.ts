import type {
  InsertBatchResult,
  SemaphoreOnChainPort,
} from '../../src/modules/checkpoints/domain/semaphore-onchain.port';

/** Fake controlable para tests de ApproveBatchUseCase -- no toca ethers/Hardhat. */
export class FakeSemaphoreOnChainService implements SemaphoreOnChainPort {
  callCount = 0;
  shouldFail = false;
  lastElectionId: string | null = null;
  lastCommitments: string[] | null = null;

  async insertBatch(electionId: string, commitments: string[]): Promise<InsertBatchResult> {
    this.callCount += 1;
    this.lastElectionId = electionId;
    this.lastCommitments = commitments;
    if (this.shouldFail) {
      throw new Error('fake on-chain failure');
    }
    return {
      txHash: `0xfake-${this.callCount}`,
      newRoot: `fake-root-${this.callCount}`,
      groupId: `fake-group-${electionId}`,
    };
  }
}
