import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy } from '@/lib/access/enforce-access-policy';
import { HomePage } from '@/components/home/HomePage';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context, location }) => {
    await enforceAccessPolicy(context, 'guest', location.href);
  },
  component: HomePage,
});
