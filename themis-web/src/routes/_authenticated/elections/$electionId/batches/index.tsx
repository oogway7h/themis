import { createFileRoute } from '@tanstack/react-router';
import { requireBatchViewer } from '@/features/auth/lib/role-guards';
import { BatchesPage } from '@/features/batch-approval/pages/BatchesPage';

export const Route = createFileRoute('/_authenticated/elections/$electionId/batches/')({
  beforeLoad: ({ context }) => requireBatchViewer(context.auth),
  component: RouteComponent,
});

function RouteComponent() {
  const { electionId } = Route.useParams();
  return <BatchesPage electionId={electionId} />;
}
