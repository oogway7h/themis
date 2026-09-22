import type { VoteReceiptEntity } from './vote-receipt.entity';

export const VOTING_REPOSITORY = Symbol('VOTING_REPOSITORY');

export interface CreateVoteReceiptData {
  electionId: string;
  optionId: string;
  nullifier: string;
  txHash: string;
}

export interface PublicElectionOption {
  id: string;
  nombre: string;
  descripcion: string | null;
  onChainIndex: number | null;
}

export interface PublicElectionDetail {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  votacionInicio: Date;
  votacionFin: Date;
  onChainGroupId: string | null;
  merkleRoot: string | null;
  opciones: PublicElectionOption[];
}

export interface VotingRepository {
  findPublicActiveElections(): Promise<PublicElectionDetail[]>;
  findPublicElectionById(id: string): Promise<PublicElectionDetail | null>;
  findVoteReceiptByNullifier(nullifier: string): Promise<VoteReceiptEntity | null>;
  saveVoteReceipt(data: CreateVoteReceiptData): Promise<VoteReceiptEntity>;
  findInsertedCommitmentsByElectionId(electionId: string): Promise<string[]>;
  markVoterHasVoted(electionId: string, scopedTokenHash: string): Promise<void>;
  hasVoterVoted(electionId: string, scopedTokenHash: string): Promise<boolean>;
  isVoterRegistered(electionId: string, scopedTokenHash: string): Promise<boolean>;
}
