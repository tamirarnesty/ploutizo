import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/lib/auth/require-access';
import { Onboarding } from '../components/onboarding/Onboarding';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => requireAuth(),
  component: Onboarding,
});
