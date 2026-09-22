import { createFileRoute } from '@tanstack/react-router';
import { requireBatchViewer } from '@/features/auth/lib/role-guards';
import { BatchDetailPage } from '@/features/batch-approval/pages/BatchDetailPage';

export const Route = createFileRoute('/_authenticated/elections/$electionId/batches/$batchId')({
  beforeLoad: ({ context }) => requireBatchViewer(context.auth),
  component: RouteComponent,
});

function RouteComponent() {
  const { electionId, batchId } = Route.useParams();
  return <BatchDetailPage electionId={electionId} batchId={batchId} />;
}
