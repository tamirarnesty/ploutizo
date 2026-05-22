import { createFileRoute } from '@tanstack/react-router';
import { Settlements } from '@/components/settlements/Settlements';

export const Route = createFileRoute('/_layout/settlements')({
  component: Settlements,
});
