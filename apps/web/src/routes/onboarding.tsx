import { createFileRoute } from '@tanstack/react-router';
import { Onboarding } from '../components/onboarding/Onboarding';
import { requireAuth } from '@/lib/auth/require-access';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => requireAuth(),
  component: Onboarding,
});
