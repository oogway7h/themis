import { createFileRoute } from '@tanstack/react-router';
import { requireAdmin } from '@/features/auth/lib/role-guards';
import { ElectionDetailPage } from '@/features/admin-elections/pages/ElectionDetailPage';

export const Route = createFileRoute('/_authenticated/admin/elections/$electionId')({
  beforeLoad: ({ context }) => requireAdmin(context.auth),
  component: RouteComponent,
});

function RouteComponent() {
  const { electionId } = Route.useParams();
  return <ElectionDetailPage electionId={electionId} />;
}
