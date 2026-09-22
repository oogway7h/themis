import type { BatchApprovalDto } from '../types/batch.types';

export interface ApprovalProgressProps {
  approvalCount: number;
  approvalsRequired: number;
  approvals?: BatchApprovalDto[];
}

/**
 * "X de N aprobaciones" con barra. Lista solo el rol descriptivo de cada
 * aprobacion: nunca identidad real (regla de diseno 2 del proyecto).
 */
export function ApprovalProgress({
  approvalCount,
  approvalsRequired,
  approvals,
}: ApprovalProgressProps) {
  const percent =
    approvalsRequired > 0 ? Math.min(100, (approvalCount / approvalsRequired) * 100) : 0;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {approvalCount} de {approvalsRequired} aprobaciones
      </p>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={approvalsRequired}
        aria-valuenow={approvalCount}
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      {approvals && approvals.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          {approvals.map((approval) => (
            <li key={approval.authorityId}>
              {approval.rolDescriptivo} — {new Date(approval.approvedAt).toLocaleString('es-BO')}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
