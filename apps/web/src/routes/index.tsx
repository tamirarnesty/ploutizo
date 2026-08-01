import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/home/HomePage';
import { redirectIfAuthenticated } from '@/lib/auth/require-access';

export const Route = createFileRoute('/')({
  beforeLoad: () => redirectIfAuthenticated(),
  component: HomePage,
});
