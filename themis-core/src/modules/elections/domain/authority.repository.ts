import { Authority } from './authority.entity';

export interface DesignateAuthorityInput {
  platformUserId: string;
  rolDescriptivo: string;
}

export interface ReplaceAuthorityInput {
  platformUserId?: string;
  rolDescriptivo?: string;
  updatedBy: string;
}

export interface AuthorityRepository {
  designateAll(
    electionId: string,
    inputs: DesignateAuthorityInput[],
    createdBy: string,
  ): Promise<Authority[]>;
  replace(authorityId: string, input: ReplaceAuthorityInput): Promise<Authority>;
  findByElection(electionId: string): Promise<Authority[]>;
  findById(authorityId: string): Promise<Authority | null>;
  /** CU-08 (descubrimiento): en que elecciones esta designada esta cuenta. */
  findByPlatformUser(platformUserId: string): Promise<Authority[]>;
}

export const AUTHORITY_REPOSITORY = 'AUTHORITY_REPOSITORY';
