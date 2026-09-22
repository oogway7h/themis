export interface VoteReceiptEntity {
  id: string;
  electionId: string;
  optionId: string;
  nullifier: string;
  txHash: string;
  createdAt: Date;
}
