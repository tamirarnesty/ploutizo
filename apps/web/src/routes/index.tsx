import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy } from '@/lib/access';
import { HomePage } from '@/components/home/HomePage';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context, location }) => {
    enforceAccessPolicy(context, 'guest', location.href);
  },
  component: HomePage,
});
