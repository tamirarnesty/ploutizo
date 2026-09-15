import { createFileRoute } from '@tanstack/react-router';
import { loadAccess } from '@/lib/auth/load-access';
import { Onboarding } from '../components/onboarding/Onboarding';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => loadAccess('signed-in'),
  component: Onboarding,
});
