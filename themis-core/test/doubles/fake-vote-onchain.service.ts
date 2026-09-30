import type {
  OnChainVoteEvent,
  SemaphoreProofInput,
  ValidateProofResult,
  VoteOnChainErrorKind,
  VoteOnChainPort,
} from '../../src/modules/voting/domain/vote-onchain.port';
import { VoteOnChainError } from '../../src/modules/voting/domain/vote-onchain.port';

/** Fake controlable para tests de voting/ -- no toca ethers/Hardhat. */
export class FakeVoteOnChainService implements VoteOnChainPort {
  callCount = 0;
  failWith: VoteOnChainErrorKind | null = null;
  currentBlock = 100;
  eventsToReturn: OnChainVoteEvent[] = [];
  lastGroupId: string | null = null;
  lastProof: SemaphoreProofInput | null = null;

  async validateProof(
    groupId: string,
    proof: SemaphoreProofInput,
  ): Promise<ValidateProofResult> {
    this.callCount += 1;
    this.lastGroupId = groupId;
    this.lastProof = proof;
    if (this.failWith) {
      throw new VoteOnChainError(this.failWith, `fake failure: ${this.failWith}`);
    }
    return { txHash: `0xfake-vote-${this.callCount}`, blockNumber: this.currentBlock };
  }

  lastRange: [number, number] | null = null;

  async fetchProofValidatedEvents(
    _groupId: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<OnChainVoteEvent[]> {
    this.lastRange = [fromBlock, toBlock];
    return this.eventsToReturn;
  }

  async getCurrentBlockNumber(): Promise<number> {
    return this.currentBlock;
  }

  /** Por defecto, cualquier bloque es "posterior a todo" (sync ya al dia). */
  blockTimestamp: Date | null = new Date('2100-01-01T00:00:00Z');

  async getBlockTimestamp(): Promise<Date | null> {
    return this.blockTimestamp;
  }
}
