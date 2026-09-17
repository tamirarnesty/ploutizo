import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy } from '@/lib/access';
import { Onboarding } from '../components/onboarding/Onboarding';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context, location }) => {
    enforceAccessPolicy(context, 'signed-in', location.href);
  },
  component: Onboarding,
});
