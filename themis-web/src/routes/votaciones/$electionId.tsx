import { createFileRoute } from '@tanstack/react-router';
import { VotacionDetallePage } from '@/features/votaciones/pages/VotacionDetallePage';

export const Route = createFileRoute('/votaciones/$electionId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { electionId } = Route.useParams();
  return <VotacionDetallePage electionId={electionId} />;
}
