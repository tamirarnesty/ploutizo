import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/home/HomePage';
import { enforceAccessPolicy } from '@/lib/auth/enforce-access';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context, location }) => {
    enforceAccessPolicy(context.access, 'guest', location.href);
  },
  component: HomePage,
});
