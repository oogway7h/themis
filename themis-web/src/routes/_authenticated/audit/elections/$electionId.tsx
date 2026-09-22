import { createFileRoute } from '@tanstack/react-router';
import { requireAuditor } from '@/features/auth/lib/role-guards';
import { AuditElectionDetailPage } from '@/features/audit/pages/AuditElectionDetailPage';

export const Route = createFileRoute('/_authenticated/audit/elections/$electionId')({
  beforeLoad: ({ context }) => requireAuditor(context.auth),
  component: RouteComponent,
});

function RouteComponent() {
  const { electionId } = Route.useParams();
  return <AuditElectionDetailPage electionId={electionId} />;
}
