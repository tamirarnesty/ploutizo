import { createFileRoute } from '@tanstack/react-router';
import { Income } from '@/components/income/Income';

export const Route = createFileRoute('/_layout/income')({
  component: Income,
});
