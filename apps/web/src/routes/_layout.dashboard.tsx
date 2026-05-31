import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { dashboardSearchSchema } from '@/components/dashboard/dashboardSearch';

export const Route = createFileRoute('/_layout/dashboard')({
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  component: Dashboard,
});
