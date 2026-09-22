// Contrato TS a mano, siguiendo BatchResponseDto / BatchDetailResponseDto de
// themis-core (src/modules/checkpoints/presentation/dto).
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.

export type BatchStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'INSERTED'
  | 'INSERTION_FAILED';

export interface BatchDto {
  id: string;
  status: BatchStatus;
  credentialCount: number;
  approvalsRequired: number;
  approvalCount: number;
  /** true si la cuenta autenticada ya aprobó este lote (lo calcula el backend). */
  yaAprobado: boolean;
  closedAt: string;
  insertedAt: string | null;
  merkleRootAfter: string | null;
  onChainTxHash: string | null;
  failureReason: string | null;
}

/** Nunca trae identidad real ni commitments: solo el rol descriptivo del asiento. */
export interface BatchApprovalDto {
  authorityId: string;
  rolDescriptivo: string;
  approvedAt: string;
}

export interface BatchDetailDto extends BatchDto {
  approvals: BatchApprovalDto[];
}
