import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/home/HomePage';
import { loadAccess } from '@/lib/auth/load-access';

export const Route = createFileRoute('/')({
  beforeLoad: () => loadAccess('guest'),
  component: HomePage,
});
