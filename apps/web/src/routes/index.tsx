import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/home/HomePage';
import { enforceAccess } from '@/lib/access';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context, location }) => {
    enforceAccess(context.access, 'guest', location.href);
  },
  component: HomePage,
});
