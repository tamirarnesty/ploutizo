import { createFileRoute } from '@tanstack/react-router';
import { enforceAccess } from '@/lib/access';
import { Onboarding } from '../components/onboarding/Onboarding';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context, location }) => {
    enforceAccess(context.access, 'signed-in', location.href);
  },
  component: Onboarding,
});
