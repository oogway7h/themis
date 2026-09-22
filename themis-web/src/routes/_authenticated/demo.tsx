import { createFileRoute } from '@tanstack/react-router';
import { DemoPage } from '@/features/demo/pages/DemoPage';

export const Route = createFileRoute('/_authenticated/demo')({
  component: DemoPage,
});
