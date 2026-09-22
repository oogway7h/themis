import { createFileRoute } from '@tanstack/react-router';
import { ProvePage } from '@/features/prove/pages/ProvePage';

export const Route = createFileRoute('/prove')({
  component: ProvePage,
});
